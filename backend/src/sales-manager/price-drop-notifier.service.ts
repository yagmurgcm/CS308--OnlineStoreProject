import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import nodemailer from 'nodemailer';
import { WishlistItem } from '../wishlist/wishlist-item.entity';

export type PriceDropEvent = {
  productId: number;
  productName: string;
  oldPrice: number;
  newPrice: number;
};

@Injectable()
export class PriceDropNotifierService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepo: Repository<WishlistItem>,
  ) {}

  async notifyPriceDrops(events: PriceDropEvent[]): Promise<void> {
    if (!events.length) return;
    const productIds = Array.from(new Set(events.map((e) => e.productId)));
    if (!productIds.length) return;

    const wishlistEntries = await this.wishlistRepo.find({
      where: { productId: In(productIds) },
      relations: ['user', 'product'],
    });
    if (!wishlistEntries.length) return;

    const transport = this.createTransport();
    if (!transport) {
      console.warn(
        '[WishlistNotifier] Email transport missing (set SMTP_* env vars). Notifications skipped.',
      );
      return;
    }

    const eventByProduct = new Map<number, PriceDropEvent>();
    events.forEach((evt) => eventByProduct.set(evt.productId, evt));

    const userProductKey = (userId: number, productId: number) =>
      `${userId}:${productId}`;
    const sent = new Set<string>();

    for (const entry of wishlistEntries) {
      const user = entry.user;
      const event = eventByProduct.get(entry.productId);
      if (!user || !user.email || !event) continue;

      const key = userProductKey(user.id, entry.productId);
      if (sent.has(key)) continue;
      sent.add(key);

      const subject =
        'Price Drop Alert: A product from your wishlist is now on sale!';
      const text = [
        `Hi ${user.name || ''}`.trim() + ',',
        '',
        `Good news! "${event.productName}" from your wishlist is now on sale.`,
        `Previous price: ${event.oldPrice.toFixed(2)}`,
        `New price: ${event.newPrice.toFixed(2)}`,
        '',
        'This product was in your wishlist, now it’s on sale!',
      ].join('\n');

      const html = [
        `<p>Hi ${user.name || ''},</p>`,
        `<p>Good news! <strong>${event.productName}</strong> from your wishlist is now on sale.</p>`,
        `<p><strong>Previous price:</strong> ${event.oldPrice.toFixed(2)}<br/>`,
        `<strong>New price:</strong> ${event.newPrice.toFixed(2)}</p>`,
        `<p>This product was in your wishlist, now it’s on sale!</p>`,
      ].join('');

      try {
        await transport.sendMail({
          to: user.email,
          from:
            process.env.MAIL_FROM ||
            process.env.SMTP_FROM ||
            'no-reply@online-store.local',
          subject,
          text,
          html,
        });
      } catch (err) {
        console.error(
          `[WishlistNotifier] Failed to send price drop email to ${user.email}`,
          err,
        );
      }
    }
  }

  private createTransport() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
}
