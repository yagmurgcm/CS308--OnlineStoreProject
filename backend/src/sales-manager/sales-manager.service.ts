import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/order.entity';
import { InvoiceService } from '../order/invoice.service';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { GetFinanceSummaryQueryDto } from './dto/get-finance-summary-query.dto';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';
import {
  PriceDropEvent,
  PriceDropNotifierService,
} from './price-drop-notifier.service';

@Injectable()
export class SalesManagerService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly invoiceService: InvoiceService,
    private readonly priceDropNotifier: PriceDropNotifierService,
  ) {}

  getDashboard() {
    return {
      title: 'Sales Manager Dashboard',
      actions: [
        {
          label: 'Apply Discount',
          description: 'Configure discount campaigns for eligible products.',
          href: '/sales-manager/discounts',
        },
        {
          label: 'View Invoices',
          description: 'Review and export the latest customer invoices.',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  async applyDiscount(dto: ApplyDiscountDto) {
    const ids = Array.from(
      new Set(dto.productIds.filter((id) => Number.isInteger(id))),
    );
    if (!ids.length) {
      throw new BadRequestException('At least one product must be selected');
    }

    const discountRate = Math.min(Math.max(dto.discountRate, 0), 90);
    const multiplier = discountRate / 100;

    const products = await this.productRepo.find({
      where: { id: In(ids) },
    });
    if (!products.length) {
      throw new BadRequestException('No matching products were found');
    }

    const drops: PriceDropEvent[] = [];

    for (const product of products) {
      const basePrice = Number(product.price) || 0;
      const newPrice =
        discountRate > 0
          ? Number((basePrice * (1 - multiplier)).toFixed(2))
          : basePrice;

      product.discountRate = discountRate;
      product.discountedPrice = discountRate > 0 ? newPrice : null;

      if (discountRate > 0 && newPrice < basePrice) {
        drops.push({
          productId: product.id,
          productName: product.name,
          oldPrice: basePrice,
          newPrice,
        });
      }
    }

    await this.productRepo.save(products);
    try {
      await this.priceDropNotifier.notifyPriceDrops(drops);
    } catch (err) {
      // Notification failures should not block discount application
      console.error('[PriceDropNotifier] Notification failed', err);
    }

    return {
      updatedCount: products.length,
      discountRate,
    };
  }

  async getInvoices(query: GetInvoicesQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query.start, query.end);

    const orders = await this.orderRepo.find({
      where: { createdAt: Between(startDate, endDate) },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    return orders.map((order) => ({
      id: order.id,
      date: order.createdAt,
      status: order.status,
      total: order.totalPrice,
      customer: {
        id: order.user?.id ?? null,
        name: order.contactName ?? order.user?.name ?? null,
        email: order.contactEmail ?? order.user?.email ?? null,
      },
    }));
  }

  async getInvoicePdf(orderId: number): Promise<Buffer> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.invoiceService.generateInvoicePdf(orderId);
  }

  async getFinanceSummary(query: GetFinanceSummaryQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query.start, query.end);
    const groupBy = query.groupBy ?? 'day';

    const excludedStatuses = ['cancelled', 'failed'];

    const orders = await this.orderRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: Not(In(excludedStatuses)),
      },
      order: { createdAt: 'ASC' },
      relations: ['details', 'details.product', 'details.variant'],
    });

    const seriesMap = new Map<
      string,
      { revenue: number; cost: number; profit: number }
    >();

    let revenueTotal = 0;
    let costTotal = 0;
    let profitTotal = 0;

    for (const order of orders) {
      const bucket = this.getBucketKey(order.createdAt, groupBy);
      for (const detail of order.details ?? []) {
        const quantity = this.coerceNumber(detail.quantity);
        const returned = this.coerceNumber(detail.returnedQuantity ?? 0);
        const netQty = Math.max(0, quantity - returned);
        if (netQty <= 0) continue;

        const unitPrice = this.resolveUnitPrice(detail);
        const revenue = unitPrice * netQty;
        const unitCost = unitPrice * 0.5;
        const cost = unitCost * netQty;
        const profit = revenue - cost;

        revenueTotal += revenue;
        costTotal += cost;
        profitTotal += profit;

        const existing = seriesMap.get(bucket) ?? {
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit += profit;
        seriesMap.set(bucket, existing);
      }
    }

    const series = Array.from(seriesMap.entries()).map(([bucket, totals]) => ({
      bucket,
      revenue: this.roundCurrency(totals.revenue),
      cost: this.roundCurrency(totals.cost),
      profit: this.roundCurrency(totals.profit),
    }));

    return {
      revenueTotal: this.roundCurrency(revenueTotal),
      costTotal: this.roundCurrency(costTotal),
      profitTotal: this.roundCurrency(profitTotal),
      series,
    };
  }

  private parseDateRange(start: string, end: string) {
    const startDate = this.parseDateOnly(start, false);
    const endDate = this.parseDateOnly(end, true);
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }
    return { startDate, endDate };
  }

  private parseDateOnly(value: string, endOfDay: boolean) {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new BadRequestException('Invalid date value.');
    }
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
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

  private resolveUnitPrice(detail: {
    price?: number | string | null;
    lineTotal?: number | string | null;
    quantity?: number | string | null;
    variant?: { price?: number | string | null } | null;
    product?: { price?: number | string | null } | null;
  }): number {
    if (detail.price !== null && detail.price !== undefined) {
      return this.coerceNumber(detail.price);
    }
    if (detail.lineTotal !== null && detail.lineTotal !== undefined) {
      const quantity = this.coerceNumber(detail.quantity);
      const lineTotal = this.coerceNumber(detail.lineTotal);
      if (quantity > 0) {
        return lineTotal / quantity;
      }
    }
    if (detail.variant?.price !== null && detail.variant?.price !== undefined) {
      return this.coerceNumber(detail.variant.price);
    }
    return this.coerceNumber(detail.product?.price);
  }

  private getBucketKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const base = new Date(date);
    if (groupBy === 'month') {
      base.setDate(1);
    } else if (groupBy === 'week') {
      const day = base.getDay();
      const offset = (day + 6) % 7;
      base.setDate(base.getDate() - offset);
    }
    return this.formatDate(base);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
