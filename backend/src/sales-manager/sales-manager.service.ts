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
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SalesManagerService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(WishlistItem)
    private readonly wishlistRepo: Repository<WishlistItem>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly invoiceService: InvoiceService,
    private readonly mailService: MailService,
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

    const rawDiscountRate = Number(dto.discountRate);
    if (!Number.isFinite(rawDiscountRate) || rawDiscountRate < 0 || rawDiscountRate > 90) {
      throw new BadRequestException('Discount rate must be between 0 and 90');
    }
    const discountRate = Math.min(Math.max(rawDiscountRate, 0), 90);
    const multiplier = discountRate / 100;

    const products = await this.productRepo.find({
      where: { id: In(ids) },
    });
    if (!products.length) {
      throw new NotFoundException('No matching products were found');
    }

    for (const product of products) {
      const basePrice = Number(product.price) || 0;
      const newPrice =
        discountRate > 0
          ? Number((basePrice * (1 - multiplier)).toFixed(2))
          : basePrice;

      product.discountRate = discountRate;
      product.discountedPrice = discountRate > 0 ? newPrice : null;
    }

    await this.productRepo.save(products);
    try {
      await this.notifyWishlistUsers(products);
    } catch (err) {
      // Notification failures should not block discount application
      console.error('[WishlistNotifier] Notification failed', err);
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
      relations: ['user', 'details', 'details.product'],
    });

    return orders.map((order) => {
      // Calculate total with discounted prices
      let calculatedTotal = 0;
      if (order.details && order.details.length > 0) {
        for (const detail of order.details) {
          const product = detail.product;
          let unitPrice = this.coerceNumber(detail.price);
          
          // Check if product has discountedPrice
          if (product?.discountedPrice !== null && product?.discountedPrice !== undefined) {
            unitPrice = this.coerceNumber(product.discountedPrice);
          }
          // Or calculate from discountRate
          else if (product?.discountRate && this.coerceNumber(product.discountRate) > 0 && product?.price) {
            const originalPrice = this.coerceNumber(product.price);
            const discountRate = this.coerceNumber(product.discountRate);
            unitPrice = originalPrice * (1 - discountRate / 100);
          }
          
          const quantity = this.coerceNumber(detail.quantity);
          calculatedTotal += unitPrice * quantity;
        }
      } else {
        // Fallback to order.totalPrice if no details
        calculatedTotal = this.coerceNumber(order.totalPrice);
      }

      return {
        id: order.id,
        date: order.createdAt,
        status: order.status,
        total: this.roundCurrency(calculatedTotal),
        customer: {
          id: order.user?.id ?? null,
          name: order.contactName ?? order.user?.name ?? null,
          email: order.contactEmail ?? order.user?.email ?? null,
        },
      };
    });
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
        const unitCost = unitPrice * 0.4;
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

  private async notifyWishlistUsers(products: Product[]) {
    const discountedProducts = products.filter((product) => {
      const basePrice = Number(product.price) || 0;
      const discountedPrice =
        product.discountedPrice !== null && product.discountedPrice !== undefined
          ? Number(product.discountedPrice)
          : null;
      return (
        product.discountRate > 0 &&
        discountedPrice !== null &&
        discountedPrice < basePrice
      );
    });
    if (!discountedProducts.length) return;

    const discountedIds = discountedProducts.map((p) => p.id);
    console.log('=== DISCOUNT APPLIED ===');
    discountedProducts.forEach((p) => console.log('Product ID:', p.id));
    console.log('[WishlistNotifier] Discounted product IDs', discountedIds);

    const productMap = new Map<number, Product>();
    discountedProducts.forEach((product) => productMap.set(product.id, product));

    const wishlistEntries = await this.wishlistRepo.find({
      where: { productId: In(discountedIds) },
      relations: ['user'],
    });
    console.log(
      '[WishlistNotifier] Matched wishlist entries',
      wishlistEntries.map((entry) => ({
        wishlistId: entry.id,
        productId: entry.productId,
        userId: entry.userId,
        userEmail: entry.user?.email ?? null,
      })),
    );
    console.log('Wishlist items count:', wishlistEntries.length);
    if (!wishlistEntries.length) return;

    const users = new Map<number, { user: User; products: Product[] }>();
    for (const entry of wishlistEntries) {
      const user = entry.user;
      const product = productMap.get(entry.productId);
      if (!user || !product) continue;

      const existing = users.get(user.id);
      if (existing) {
        if (!existing.products.find((p) => p.id === product.id)) {
          existing.products.push(product);
        }
      } else {
        users.set(user.id, { user, products: [product] });
      }
    }

    if (!users.size) return;
    console.log(
      '[WishlistNotifier] Unique users to notify',
      Array.from(users.values()).map(({ user, products }) => ({
        userId: user.id,
        email: user.email,
        products: products.map((p) => p.id),
      })),
    );

    // Notifications are temporarily disabled; email still goes out.
    // const notifications = Array.from(users.values()).map(({ user, products }) => {
    //   const sample = products[0]?.name ?? 'A product';
    //   const message =
    //     products.length > 1
    //       ? `${products.length} products in your wishlist (e.g. ${sample}) are now discounted.`
    //       : `${sample} from your wishlist is now discounted.`;
    //   return this.notificationRepo.create({
    //     userId: user.id,
    //     title: 'Wishlist item discounted',
    //     message,
    //   });
    // });
    // await this.notificationRepo.save(notifications);

    await Promise.allSettled(
      Array.from(users.values()).map(({ user, products }) =>
        this.sendWishlistEmail(user, products),
      ),
    );
  }

  private async sendWishlistEmail(
    user: User,
    products: Product[],
  ): Promise<void> {
    if (!user.email || !products.length) return;

    const subject =
      products.length > 1
        ? 'Products in your wishlist were discounted'
        : 'A product in your wishlist was discounted';

    const productLines = products.map((product) => {
      const basePrice = Number(product.price) || 0;
      const discounted = Number(product.discountedPrice ?? product.price) || 0;
      return `- ${product.name}: ${basePrice.toFixed(2)} → ${discounted.toFixed(
        2,
      )}`;
    });

    const text = [
      `Hi ${user.name || ''}`.trim() + ',',
      '',
      'Good news! Item(s) from your wishlist are now discounted:',
      ...productLines,
      '',
      'Visit the store to take advantage of the new prices.',
    ].join('\n');

    const html = [
      `<p>Hi ${user.name || ''},</p>`,
      `<p>Good news! Item(s) from your wishlist are now discounted:</p>`,
      `<ul>${productLines
        .map((line) => `<li>${line.replace('- ', '')}</li>`)
        .join('')}</ul>`,
      '<p>Visit the store to take advantage of the new prices.</p>',
    ].join('');

    try {
      console.log('SENDING MAIL TO:', user.email);
      const info = await this.mailService.sendMail({
        to: user.email,
        from:
          process.env.MAIL_FROM ||
          process.env.SMTP_FROM ||
          'no-reply@online-store.local',
        subject,
        text,
        html,
      });
      if (info) {
        console.log(
          `[WishlistNotifier] Mail accepted for ${user.email}: ${info.response ?? info.messageId}`,
        );
      } else {
        console.warn(
          `[WishlistNotifier] Mail transport unavailable; email not sent to ${user.email}`,
        );
      }
    } catch (err) {
      console.error(
        `[WishlistNotifier] Failed to send discount email to ${user.email}`,
        err,
      );
    }
  }

  async sendTestDiscountEmail(to: string) {
    try {
      const info = await this.mailService.sendTestEmail(to);
      console.log(
        `[WishlistNotifier] Test email result for ${to}: ${
          info?.response ?? info?.messageId ?? 'no response'
        }`,
      );
      return { to, ok: Boolean(info), messageId: info?.messageId ?? null, response: info?.response ?? null };
    } catch (err) {
      console.error('[WishlistNotifier] Test email failed', err);
      throw err;
    }
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
