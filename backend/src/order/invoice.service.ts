import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import {
  InvoiceBuildOptions,
  InvoiceItemDto,
  InvoiceSummaryDto,
  InvoiceTotalsDto,
} from './dto/invoice-summary.dto';

@Injectable()
export class InvoiceService {
  private readonly defaultTaxRate = 0.18;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
  ) {}

  async buildInvoiceSummary(
    orderId: number,
    options: InvoiceBuildOptions = {},
  ): Promise<InvoiceSummaryDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const details = await this.orderDetailRepo.find({
      where: { order: { id: orderId } },
      relations: ['product'],
      order: { id: 'ASC' },
    });

    const items: InvoiceItemDto[] = details.map((detail) => {
      const unitPrice = this.coerceNumber(detail.price);
      const quantity = detail.quantity;
      const lineTotal = this.roundCurrency(unitPrice * quantity);

      return {
        productName: detail.product?.name ?? 'Product',
        variant: detail.product?.subcategory ?? null,
        unitPrice,
        quantity,
        lineTotal,
      };
    });

    const totals = this.calculateTotals(items, options);

    return {
      orderId: order.id,
      customer: {
        userId: order.user?.id ?? 0,
        email: order.user?.email ?? null,
      },
      createdAt: order.createdAt,
      items,
      totals,
    };
  }

  private calculateTotals(
    items: InvoiceItemDto[],
    options: InvoiceBuildOptions,
  ): InvoiceTotalsDto {
    const subtotal = this.roundCurrency(
      items.reduce((acc, item) => acc + item.lineTotal, 0),
    );
    const taxRate = options.taxRate ?? this.defaultTaxRate;
    const tax = this.roundCurrency(subtotal * taxRate);
    const discount = this.roundCurrency(options.discount ?? 0);
    const shipment = this.roundCurrency(options.shipment ?? 0);
    const grandTotal = this.roundCurrency(subtotal + tax + shipment - discount);

    return {
      subtotal,
      tax,
      discount,
      shipment,
      grandTotal,
    };
  }

  private coerceNumber(value: string | number | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
