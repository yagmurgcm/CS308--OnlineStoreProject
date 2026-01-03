import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import {
  InvoiceBuildOptions,
  InvoiceItemDto,
  InvoiceSummaryDto,
  InvoiceTotalsDto,
} from './dto/invoice-summary.dto';
import { MailService } from '../mail/mail.service';

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

// MKN Brand Colors
const BRAND_COLOR = '#8a0012'; // Bordo
const TEXT_COLOR = '#111111';
const MUTED_COLOR = '#6b7280';
const LINE_COLOR = '#eaeaea';

// Currency formatter - TL
const formatCurrency = (amount: number): string => {
  return `${amount.toFixed(2)} TL`;
};

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
    private readonly mailService: MailService,
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
      where: { orderId },
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
    const tax = 0;
    const discount = this.roundCurrency(options.discount ?? 0);
    const shipment = this.roundCurrency(options.shipment ?? 0);
    const grandTotal = this.roundCurrency(subtotal + shipment - discount);

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
    options: InvoiceEmailOptions = {},
  ): Promise<Buffer> {
    const summary = await this.buildInvoiceSummary(orderId, options);

    // Order'dan bilgileri al (options boşsa)
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    const contactName = options.contactName ?? order?.contactName ?? '';
    const contactPhone = options.contactPhone ?? order?.contactPhone ?? '';
    const contactEmail = options.to ?? order?.contactEmail ?? summary.customer.email ?? '';
    const shippingAddress = options.shippingAddress ?? order?.shippingAddress ?? '';
    const shippingCity = options.shippingCity ?? order?.shippingCity ?? '';
    const shippingPostalCode = options.shippingPostalCode ?? order?.shippingPostalCode ?? '';
    const shippingCountry = options.shippingCountry ?? order?.shippingCountry ?? '';
    const paymentBrand = options.paymentBrand ?? order?.paymentBrand ?? '';
    const paymentLast4 = options.paymentLast4 ?? order?.paymentLast4 ?? '';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice #${summary.orderId}`,
          Author: 'MKN Store',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const marginLeft = 50;
      const marginRight = 50;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // ========== HEADER ==========
      // Bordo banner
      doc.rect(0, 0, pageWidth, 80).fill(BRAND_COLOR);

      // MKN Logo
      doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('MKN', marginLeft, 28, { characterSpacing: 8 });

      // Invoice title
      doc.fontSize(12).fillColor('#ffffff').font('Helvetica');
      doc.text('INVOICE', pageWidth - marginRight - 80, 32, { width: 80, align: 'right' });

      // ========== INVOICE INFO ==========
      let y = 110;

      doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(11);
      doc.text(`Invoice #${summary.orderId}`, marginLeft, y);

      doc.font('Helvetica').fontSize(10).fillColor(MUTED_COLOR);
      doc.text(
        `Date: ${summary.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`,
        marginLeft,
        y + 18,
      );

      // ========== BILLING / SHIPPING INFO ==========
      y = 170;

      // Left column - Bill To
      doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(10);
      doc.text('BILL TO', marginLeft, y);

      doc.font('Helvetica').fontSize(10).fillColor(TEXT_COLOR);
      y += 18;
      
      if (contactName) {
        doc.text(contactName, marginLeft, y);
        y += 14;
      }
      if (contactEmail) {
        doc.text(contactEmail, marginLeft, y);
        y += 14;
      }
      if (contactPhone) {
        doc.text(contactPhone, marginLeft, y);
        y += 14;
      }

      // Right column - Ship To
      const rightColX = pageWidth / 2 + 20;
      let yRight = 170;

      doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(10);
      doc.text('SHIP TO', rightColX, yRight);

      doc.font('Helvetica').fontSize(10).fillColor(TEXT_COLOR);
      yRight += 18;

      const hasShippingInfo = shippingAddress || shippingCity || shippingPostalCode || shippingCountry;

      if (hasShippingInfo) {
        if (shippingAddress) {
          doc.text(shippingAddress, rightColX, yRight, { width: 200 });
          yRight += 14;
        }
        if (shippingCity) {
          doc.text(shippingCity, rightColX, yRight);
          yRight += 14;
        }
        if (shippingPostalCode) {
          doc.text(shippingPostalCode, rightColX, yRight);
          yRight += 14;
        }
        if (shippingCountry) {
          doc.text(shippingCountry, rightColX, yRight);
          yRight += 14;
        }
      } else {
        doc.fillColor(MUTED_COLOR).text('Same as billing', rightColX, yRight);
        yRight += 14;
      }

      // ========== ITEMS TABLE ==========
      y = Math.max(y, yRight) + 30;

      // Table header background
      doc.rect(marginLeft, y, contentWidth, 28).fill('#f7f7f5');

      // Table header text
      doc.fillColor(MUTED_COLOR).font('Helvetica-Bold').fontSize(9);
      doc.text('PRODUCT', marginLeft + 10, y + 9);
      doc.text('QTY', marginLeft + contentWidth - 180, y + 9, { width: 40, align: 'center' });
      doc.text('PRICE', marginLeft + contentWidth - 130, y + 9, { width: 60, align: 'right' });
      doc.text('TOTAL', marginLeft + contentWidth - 60, y + 9, { width: 50, align: 'right' });

      y += 28;

      // Table rows
      doc.font('Helvetica').fontSize(10).fillColor(TEXT_COLOR);

      summary.items.forEach((item, index) => {
        const rowHeight = 35;
        const rowY = y + index * rowHeight;

        // Alternating row background
        if (index % 2 === 1) {
          doc.rect(marginLeft, rowY, contentWidth, rowHeight).fill('#fafafa');
        }

        // Row border bottom
        doc
          .moveTo(marginLeft, rowY + rowHeight)
          .lineTo(marginLeft + contentWidth, rowY + rowHeight)
          .strokeColor(LINE_COLOR)
          .lineWidth(0.5)
          .stroke();

        // Product name
        doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(10);
        doc.text(item.productName, marginLeft + 10, rowY + 8, {
          width: contentWidth - 200,
          ellipsis: true,
        });

        // Variant (if exists)
        if (item.variant) {
          doc.fillColor(MUTED_COLOR).fontSize(8);
          doc.text(item.variant, marginLeft + 10, rowY + 22, {
            width: contentWidth - 200,
            ellipsis: true,
          });
        }

        // Quantity
        doc.fillColor(TEXT_COLOR).fontSize(10);
        doc.text(`${item.quantity}`, marginLeft + contentWidth - 180, rowY + 12, {
          width: 40,
          align: 'center',
        });

        // Unit price
        doc.text(formatCurrency(item.unitPrice), marginLeft + contentWidth - 140, rowY + 12, {
          width: 70,
          align: 'right',
        });

        // Line total
        doc.font('Helvetica-Bold');
        doc.text(formatCurrency(item.lineTotal), marginLeft + contentWidth - 65, rowY + 12, {
          width: 55,
          align: 'right',
        });
      });

      y += summary.items.length * 35 + 20;

      // ========== TOTALS ==========
      const totalsX = marginLeft + contentWidth - 200;
      const totalsWidth = 200;

      // Subtotal
      doc.font('Helvetica').fontSize(10).fillColor(MUTED_COLOR);
      doc.text('Subtotal', totalsX, y);
      doc.fillColor(TEXT_COLOR);
      doc.text(formatCurrency(summary.totals.subtotal), totalsX + 80, y, {
        width: 120,
        align: 'right',
      });

      y += 20;

      // Shipping
      if (summary.totals.shipment > 0) {
        doc.fillColor(MUTED_COLOR);
        doc.text('Shipping', totalsX, y);
        doc.fillColor(TEXT_COLOR);
        doc.text(formatCurrency(summary.totals.shipment), totalsX + 80, y, {
          width: 120,
          align: 'right',
        });
        y += 20;
      }

      // Discount
      if (summary.totals.discount > 0) {
        doc.fillColor(MUTED_COLOR);
        doc.text('Discount', totalsX, y);
        doc.fillColor('#16a34a'); // green
        doc.text(`-${formatCurrency(summary.totals.discount)}`, totalsX + 80, y, {
          width: 120,
          align: 'right',
        });
        y += 20;
      }

      // Divider line
      doc
        .moveTo(totalsX, y)
        .lineTo(totalsX + totalsWidth, y)
        .strokeColor(TEXT_COLOR)
        .lineWidth(1)
        .stroke();

      y += 12;

      // Grand Total
      doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_COLOR);
      doc.text('Total', totalsX, y);
      doc.text(formatCurrency(summary.totals.grandTotal), totalsX + 60, y, {
        width: 140,
        align: 'right',
      });

      // ========== PAYMENT INFO ==========
      if (paymentBrand || paymentLast4) {
        y += 40;
        doc.font('Helvetica').fontSize(10).fillColor(MUTED_COLOR);
        doc.text(
          `Paid with ${paymentBrand || 'Card'} ${paymentLast4 ? `**** ${paymentLast4}` : ''}`,
          marginLeft,
          y,
        );
      }

      // ========== FOOTER ==========
      const footerY = doc.page.height - 80;

      // Footer line
      doc
        .moveTo(marginLeft, footerY)
        .lineTo(pageWidth - marginRight, footerY)
        .strokeColor(LINE_COLOR)
        .lineWidth(0.5)
        .stroke();

      // Footer text
      doc.font('Helvetica').fontSize(9).fillColor(MUTED_COLOR);
      doc.text('Thank you for shopping with MKN', marginLeft, footerY + 15, {
        width: contentWidth,
        align: 'center',
      });
      doc.text(
        'For questions, contact support@mkn.com',
        marginLeft,
        footerY + 30,
        {
          width: contentWidth,
          align: 'center',
        },
      );

      doc.end();
    });
  }

  private buildInvoiceEmailText(
    summary: InvoiceSummaryDto,
    options: InvoiceEmailOptions = {},
  ): string {
    const lines: string[] = [];
    const greetingName = options.contactName ?? 'there';
    const orderDate = summary.createdAt
      ? new Date(summary.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';
    lines.push(`Hello ${greetingName},`);
    lines.push(`Your invoice for Order #${summary.orderId} is ready.`);
    if (orderDate) {
      lines.push(`Order date: ${orderDate}`);
    }
    lines.push('');
    lines.push('Purchased products:');
    summary.items.forEach((item) => {
      const unit = formatCurrency(item.unitPrice);
      lines.push(
        `• ${item.productName} — Qty ${item.quantity} × ${unit} = ${formatCurrency(
          item.lineTotal,
        )}`,
      );
    });
    lines.push('');
    lines.push(`Order total: ${formatCurrency(summary.totals.grandTotal)}`);
    if (options.paymentBrand || options.paymentLast4) {
      lines.push(
        `Paid with ${options.paymentBrand ?? 'Card'} ${
          options.paymentLast4 ? `**** ${options.paymentLast4}` : ''
        }`,
      );
    }
    lines.push('');
    lines.push('');
    lines.push('Your PDF invoice is attached to this email.');
    lines.push('Refunded to your original payment method.');
    lines.push('');
    lines.push('Thank you for shopping with MKN Store.');

    return lines.join('\n');
  }

  async sendInvoiceEmail(
    orderId: number,
    options: InvoiceEmailOptions = {},
  ): Promise<boolean> {
    const summary = await this.buildInvoiceSummary(orderId, options);
    const to = options.to ?? summary.customer.email;
    if (!to) {
      console.warn('Invoice email skipped because no recipient email was found.');
      return false;
    }

    // Yeni PDF oluştur
    const pdf = await this.generateInvoicePdf(orderId, options);
    const subject = `Your Invoice for Order #${summary.orderId} – MKN Store`;
    const from =
      options.from ||
      process.env.MAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.MAIL_USER ||
      'mkn.store308@gmail.com';
    const text = this.buildInvoiceEmailText(summary, options);
    const html = `<p>${text.replace(/\n/g, '<br/>')}</p>`;

    try {
      await this.mailService.sendMail({
        to,
        from,
        subject,
        text,
        html,
        attachments: [
          {
            filename: `invoice-${summary.orderId}.pdf`,
            content: pdf,
          },
        ],
      });
      return true;
    } catch (err) {
      console.error('Invoice email send failed', err);
      return false;
    }
  }
}
