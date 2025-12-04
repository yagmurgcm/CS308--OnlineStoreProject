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
      const lineTotal = this.roundCurrency(
        detail.lineTotal ?? unitPrice * quantity,
      );

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

  async generateInvoicePdf(
    orderId: number,
    options: InvoiceBuildOptions = {},
  ): Promise<Buffer> {
    const summary = await this.buildInvoiceSummary(orderId, options);
    const lines: string[] = [];

    lines.push(`Invoice #${summary.orderId}`);
    lines.push(`Date: ${summary.createdAt.toISOString().substring(0, 10)}`);
    lines.push(`Customer: ${summary.customer.email ?? 'N/A'}`);
    lines.push(' ');
    lines.push('Items:');
    summary.items.forEach((item) => {
      lines.push(
        `${item.productName} x${item.quantity} @ ${item.unitPrice.toFixed(2)} = ${item.lineTotal.toFixed(2)}`,
      );
    });
    lines.push(' ');
    lines.push(
      `Subtotal: ${summary.totals.subtotal.toFixed(2)}, Tax: ${summary.totals.tax.toFixed(2)}, Shipment: ${summary.totals.shipment.toFixed(2)}, Discount: ${summary.totals.discount.toFixed(2)}`,
    );
    lines.push(`Total: ${summary.totals.grandTotal.toFixed(2)}`);

    return this.buildMinimalPdf(lines);
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private buildMinimalPdf(lines: string[]): Buffer {
    const textCommands = lines
      .map((line, idx) => {
        const escaped = this.escapePdfText(line);
        if (idx === 0) {
          return `(${escaped}) Tj`;
        }
        return `T* (${escaped}) Tj`;
      })
      .join('\n');

    const contentStream = `BT /F1 12 Tf 50 750 Td 14 TL ${textCommands} ET`;
    const contentLength = Buffer.byteLength(contentStream, 'utf8');

    const objects: string[] = [];
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
    objects.push(
      '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj',
    );
    objects.push(
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    );
    objects.push(
      `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj`,
    );
    objects.push(
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    );

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${obj}\n`;
    }

    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }
}
