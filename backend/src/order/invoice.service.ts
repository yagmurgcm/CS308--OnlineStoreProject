import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import {
  InvoiceBuildOptions,
  InvoiceItemDto,
  InvoiceSummaryDto,
  InvoiceTotalsDto,
} from './dto/invoice-summary.dto';

type InvoiceEmailOptions = InvoiceBuildOptions & {
  to?: string | null;
  from?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingCountry?: string | null;
  shippingPostalCode?: string | null;
  paymentBrand?: string | null;
  paymentLast4?: string | null;
};

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

  private buildInvoiceLines(
    summary: InvoiceSummaryDto,
    options: InvoiceEmailOptions = {},
  ): string[] {
    const lines: string[] = [];

    lines.push(`Invoice #${summary.orderId}`);
    lines.push(`Date: ${summary.createdAt.toISOString().substring(0, 10)}`);
    lines.push(`Customer: ${summary.customer.email ?? 'N/A'}`);
    if (options.contactName) {
      lines.push(`Name: ${options.contactName}`);
    }
    if (options.contactPhone) {
      lines.push(`Phone: ${options.contactPhone}`);
    }
    if (
      options.shippingAddress ||
      options.shippingCity ||
      options.shippingPostalCode ||
      options.shippingCountry
    ) {
      lines.push(
        `Ship to: ${[
          options.shippingAddress,
          options.shippingCity,
          options.shippingPostalCode,
          options.shippingCountry,
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }
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

    if (options.paymentBrand || options.paymentLast4) {
      lines.push(
        `Paid with: ${options.paymentBrand ?? 'Card'} ${
          options.paymentLast4 ? `•••• ${options.paymentLast4}` : ''
        }`,
      );
    }

    return lines;
  }

  async generateInvoicePdf(
    orderId: number,
    options: InvoiceEmailOptions = {},
  ): Promise<Buffer> {
    const summary = await this.buildInvoiceSummary(orderId, options);
    const lines = this.buildInvoiceLines(summary, options);

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

  private createTransport(): Transporter | null {
    const host = process.env.SMTP_HOST;
    const port =
      process.env.SMTP_PORT !== undefined ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private buildInvoiceEmailText(
    summary: InvoiceSummaryDto,
    options: InvoiceEmailOptions = {},
  ): string {
    const lines: string[] = [];
    const greetingName = options.contactName ?? 'there';
    lines.push(`Hello ${greetingName},`);
    lines.push(`Thank you for your purchase. Your order #${summary.orderId} is confirmed.`);
    lines.push('');
    if (options.shippingAddress || options.shippingCity || options.shippingCountry) {
      lines.push('Shipping details:');
      lines.push(
        `  ${[
          options.shippingAddress,
          options.shippingCity,
          options.shippingPostalCode,
          options.shippingCountry,
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
      lines.push('');
    }
    lines.push('Order summary:');
    summary.items.forEach((item) =>
      lines.push(
        `  • ${item.productName} x${item.quantity} = ${item.lineTotal.toFixed(2)}`,
      ),
    );
    lines.push('');
    lines.push(
      `Total: ${summary.totals.grandTotal.toFixed(
        2,
      )} (incl. tax ${summary.totals.tax.toFixed(2)})`,
    );
    if (options.paymentBrand || options.paymentLast4) {
      lines.push(
        `Paid with ${options.paymentBrand ?? 'Card'} ${
          options.paymentLast4 ? `•••• ${options.paymentLast4}` : ''
        }`,
      );
    }
    lines.push('');
    lines.push('Your invoice is attached as PDF.');
    lines.push('If you have any questions, just reply to this email.');

    return lines.join('\n');
  }

  private async sendViaResend(params: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
    pdf: Buffer;
  }): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: [
        {
          filename: `invoice-${params.subject.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`,
          content: params.pdf, // Buffer is accepted by Resend SDK
        },
      ],
    });
    console.log('[Resend] Invoice email sent to', params.to);
    return true;
  }

  async sendInvoiceEmail(
    orderId: number,
    options: InvoiceEmailOptions = {},
  ): Promise<void> {
    const summary = await this.buildInvoiceSummary(orderId, options);
    const to = options.to ?? summary.customer.email;
    if (!to) {
      console.warn('Invoice email skipped because no recipient email was found.');
      return;
    }

    const pdf = await this.generateInvoicePdf(orderId, options);
    const subject = `Order #${summary.orderId} invoice`;
    const from =
      options.from ??
      process.env.RESEND_FROM ??
      process.env.SMTP_FROM ??
      'onboarding@resend.dev';
    const text = this.buildInvoiceEmailText(summary, options);
    const html = `<p>${text.replace(/\n/g, '<br/>')}</p>`;

    if (!process.env.RESEND_API_KEY && !this.createTransport()) {
      console.warn('No email transport available (Resend and SMTP missing).');
      return;
    }

    // Try Resend first
    try {
      const sent = await this.sendViaResend({ to, from, subject, text, html, pdf });
      if (sent) return;
    } catch (err) {
      console.error('Resend invoice email failed, falling back to SMTP', err);
    }

    // Fallback to SMTP if configured
    const transport = this.createTransport();
    if (!transport) {
      return;
    }

    await transport.sendMail({
      to,
      from,
      subject,
      text,
      attachments: [
        {
          filename: `invoice-${summary.orderId}.pdf`,
          content: pdf,
        },
      ],
    });
  }
}
