import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import nodemailer, { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';
import PDFDocument from 'pdfkit';

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
        `${[
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
        `• ${item.productName} x${item.quantity} = ${formatCurrency(item.lineTotal)}`,
      ),
    );
    lines.push('');
    lines.push(`Total: ${formatCurrency(summary.totals.grandTotal)}`);
    if (options.paymentBrand || options.paymentLast4) {
      lines.push(
        `Paid with ${options.paymentBrand ?? 'Card'} ${
          options.paymentLast4 ? `**** ${options.paymentLast4}` : ''
        }`,
      );
    }
    lines.push('');
    lines.push('Your invoice is attached as PDF.');
    lines.push('If you have any questions, just reply to this email.');

    return lines.join('\n');
  }

  private async sendViaSendGrid(params: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
    pdf: Buffer;
  }): Promise<boolean> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) return false;

    try {
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: [
          {
            filename: `invoice-${params.subject.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`,
            content: params.pdf.toString('base64'),
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });
      console.log('[SendGrid] Invoice email sent to', params.to);
      return true;
    } catch (err) {
      const responseBody =
        (err as { response?: { body?: unknown } })?.response?.body;
      console.error('SendGrid invoice email failed', responseBody ?? err);
      return false;
    }
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

    // Yeni PDF oluştur
    const pdf = await this.generateInvoicePdf(orderId, options);
    const subject = `Order #${summary.orderId} Invoice - MKN`;
    const from =
      options.from ??
      process.env.SENDGRID_FROM_EMAIL ??
      process.env.SMTP_FROM ??
      'onboarding@resend.dev';
    const text = this.buildInvoiceEmailText(summary, options);
    const html = `<p>${text.replace(/\n/g, '<br/>')}</p>`;

    if (
      !process.env.SENDGRID_API_KEY &&
      !this.createTransport()
    ) {
      console.warn(
        'No email transport available (SendGrid and SMTP missing).',
      );
      return;
    }

    // Try SendGrid
    try {
      const sent = await this.sendViaSendGrid({
        to,
        from,
        subject,
        text,
        html,
        pdf,
      });
      if (sent) return;
    } catch (err) {
      console.error('SendGrid invoice email failed, falling back to SMTP', err);
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
