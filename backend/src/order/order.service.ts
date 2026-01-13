import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../product/entities/product.entity';
import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { ProductVariant } from '../product/product-variant.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { InvoiceService } from './invoice.service';
import { ReturnRequest } from './return-request.entity';
import type { ReturnRequestStatus } from './return-request.entity';
import { ReturnRequestItem } from './return-request-item.entity';
import { MailService } from '../mail/mail.service';

const CANCEL_ELIGIBLE_STATUSES = new Set([
  'pending',
  'processing',
  'in-transit',
  'shipped',
]);

const RETURN_ELIGIBLE_STATUSES = new Set([
  'delivered',
  'partially_returned',
]);

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,

    @InjectRepository(ReturnRequest)
    private readonly returnRequestRepo: Repository<ReturnRequest>,

    @InjectRepository(ReturnRequestItem)
    private readonly returnRequestItemRepo: Repository<ReturnRequestItem>,

    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    private readonly cartService: CartService,
    private readonly usersService: UsersService,
    private readonly invoiceService: InvoiceService,
    private readonly mailService: MailService,
  ) {}

  // ---------------------------------------
  // Checkout (clean version)
  // ---------------------------------------
  async checkout(userId: number, payload?: CheckoutDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let createdOrder: Order | null = null;

    await this.orderRepo.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const detailRepository = manager.getRepository(OrderDetail);
      const cartRepository = manager.getRepository(Cart);
      const variantRepository = manager.getRepository(ProductVariant);

      // 1) Load user's cart with full relations
      console.log('CHECKOUT STEP 1: loading cart for user', userId);
      const cart = await cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.variant', 'items.variant.product'],
        order: { items: { id: 'ASC' } },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }
      console.log(
        'CHECKOUT STEP 1.5: cart loaded ->',
        cart.id,
        'items:',
        cart.items.length,
      );

      // 2) Build order shell
      const order = orderRepository.create({
        user,
        status: 'processing',
        totalPrice: 0,
        contactName: payload?.fullName,
        contactEmail: payload?.email ?? user.email,
        contactPhone: payload?.phone,
        shippingAddress: payload?.address,
        shippingCity: payload?.city,
        shippingPostalCode: payload?.postalCode,
        shippingCountry: payload?.country,
        paymentBrand: payload?.cardBrand,
        paymentLast4: payload?.cardLast4,
      });

      console.log('CHECKOUT STEP 2: checking stock and computing total price');

      let totalPrice = 0;

      // İlk geçiş: Stok kontrolü ve fiyat hesaplama
      const variantsToUpdate: { variant: ProductVariant; quantity: number }[] = [];
      const variantLookup = new Map<number, ProductVariant>();

      for (const item of cart.items) {
        const variant = await variantRepository.findOne({
          where: { id: item.variant.id },
          relations: ['product'],
        });

        if (!variant || !variant.product) {
          throw new NotFoundException(
            `Variant ${item.variant.id} or its product not found`,
          );
        }

        // Stok kontrolü
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${variant.product.name}" (${variant.color} / ${variant.size}). Available: ${variant.stock}, Requested: ${item.quantity}`,
          );
        }

        variantsToUpdate.push({ variant, quantity: item.quantity });
        variantLookup.set(variant.id, variant);

        const price = Number(variant.price);
        const lineTotal = price * item.quantity;
        totalPrice += lineTotal;
      }

      order.totalPrice = totalPrice;

      // 3) Persist order
      console.log('CHECKOUT STEP 3: saving order...');
      await orderRepository.save(order);
      console.log('CHECKOUT STEP 3 DONE: order saved with id', order.id);

      // 4) Persist order details
      console.log('CHECKOUT STEP 4: inserting details...');

      const detailEntities = cart.items.map((item) => {
        const variant = variantLookup.get(item.variant.id);
        if (!variant?.product) {
          throw new NotFoundException(
            `Variant ${item.variant.id} not found while creating order details`,
          );
        }
        return detailRepository.create({
          orderId: order.id,
          productId: variant.product.id,
          variantId: variant.id,
          quantity: item.quantity,
          price: Number(variant.price),
          lineTotal: Number(variant.price) * item.quantity,
        });
      });

      await detailRepository.save(detailEntities);
      console.log('CHECKOUT STEP 4 DONE: inserted', detailEntities.length);

      // 5) Stok azaltma
      console.log('CHECKOUT STEP 5: decrementing stock...');
      for (const { variant, quantity } of variantsToUpdate) {
        variant.stock -= quantity;
        await variantRepository.save(variant);
        console.log(
          `Stock updated: Variant ${variant.id} (${variant.color}/${variant.size}) -> new stock: ${variant.stock}`,
        );
      }
      console.log('CHECKOUT STEP 5 DONE: stock decremented');

      // 6) Clear cart
      console.log('CHECKOUT STEP 6: clearing cart for user', userId);
      await this.cartService.clear(userId);

      // 7) Reload order with relations
      createdOrder = await orderRepository.findOne({
        where: { id: order.id },
        relations: ['details', 'details.product', 'user'],
      });
      console.log(
        'CHECKOUT STEP 7: reloaded order ->',
        createdOrder?.id,
        'details:',
        createdOrder?.details?.length ?? 0,
      );
    });

    if (!createdOrder) {
      throw new NotFoundException('Order could not be created');
    }

    const finalizedOrder = createdOrder as Order;
    const to = payload?.email ?? finalizedOrder.contactEmail ?? user.email;
    let invoiceEmailSent = false;
    try {
      invoiceEmailSent = await this.invoiceService.sendInvoiceEmail(
        finalizedOrder.id,
        {
          to,
          contactName: payload?.fullName ?? finalizedOrder.contactName,
          contactPhone: payload?.phone ?? finalizedOrder.contactPhone,
          shippingAddress: payload?.address ?? finalizedOrder.shippingAddress,
          shippingCity: payload?.city ?? finalizedOrder.shippingCity,
          shippingCountry: payload?.country ?? finalizedOrder.shippingCountry,
          shippingPostalCode:
            payload?.postalCode ?? finalizedOrder.shippingPostalCode,
          paymentBrand: payload?.cardBrand ?? finalizedOrder.paymentBrand,
          paymentLast4: payload?.cardLast4 ?? finalizedOrder.paymentLast4,
        },
      );
    } catch (err) {
      console.error('Failed to send invoice email', err);
    }

    // Return full order with details for frontend confirmation page
    const completeOrder = await this.orderRepo.findOne({
      where: { id: finalizedOrder.id },
      relations: ['details', 'details.product', 'details.variant', 'user'],
    });
    
    if (!completeOrder) {
      throw new NotFoundException('Order could not be retrieved after creation');
    }

    return { ...completeOrder, invoiceEmailSent };
  }

  async getOrdersByUser(userId: number) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['details', 'details.product', 'details.variant'],
    });
  }

  async getOrderById(id: number, userId?: number) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['details', 'details.product', 'details.variant', 'user'],
    });
    return this.attachPendingReturnQuantities(order, userId);
  }

  async assertOrderOwnership(orderId: number, requesterId: number) {
    const order = await this.getOrderById(orderId, requesterId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.user?.id !== requesterId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  // ============ ADMIN FONKSİYONLARI ============

  // Tüm siparişleri getir (admin için)
  async getAllOrders() {
    return this.orderRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['details', 'details.product', 'details.variant', 'user'],
    });
  }

  // Sipariş durumunu güncelle
  async updateOrderStatus(orderId: number, newStatus: string) {
    const validStatuses = [
      'processing',
      'in-transit',
      'delivered',
      'cancelled',
      'returned',
      'partially_returned',
    ];
    
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`,
      );
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations:
        newStatus === 'cancelled'
          ? ['details', 'details.variant', 'user']
          : undefined,
    });
    
    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    if (newStatus === 'cancelled') {
      return this.cancelAndRestock(orderId, order);
    }

    order.status = newStatus;
    await this.orderRepo.save(order);

    console.log(`✅ Order #${orderId} status updated to: ${newStatus}`);
    
    return this.getOrderById(orderId);
  }

  async cancelOrder(orderId: number, userId: number) {
    const order = await this.assertOrderOwnership(orderId, userId);
    this.assertWithinReturnWindow(order); // Cancel also requires 30-day window
    return this.cancelAndRestock(orderId, order);
  }

  private async cancelAndRestock(
    orderId: number,
    baseOrder?: Order | null,
  ): Promise<Order> {
    const baseStatus = (baseOrder?.status || '').toLowerCase();
    if (baseStatus === 'cancelled') {
      throw new BadRequestException('Order already cancelled');
    }
    if (baseStatus && !CANCEL_ELIGIBLE_STATUSES.has(baseStatus)) {
      throw new BadRequestException(
        'Only undelivered orders can be cancelled',
      );
    }

    let updatedOrder: Order | null = null;

    await this.orderRepo.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const detailRepository = manager.getRepository(OrderDetail);
      const variantRepository = manager.getRepository(ProductVariant);

      const current = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['details', 'details.variant', 'user'],
      });

      if (!current) {
        throw new NotFoundException('Order not found');
      }

      const status = (current.status || '').toLowerCase();
      if (status === 'cancelled') {
        throw new BadRequestException('Order already cancelled');
      }
      if (!CANCEL_ELIGIBLE_STATUSES.has(status)) {
        throw new BadRequestException(
          'Only undelivered orders can be cancelled',
        );
      }

      for (const detail of current.details ?? []) {
        const alreadyReturned = detail.returnedQuantity ?? 0;
        const restockQty = Math.max(0, detail.quantity - alreadyReturned);

        if (detail.variantId && restockQty > 0) {
          const variant = await variantRepository.findOne({
            where: { id: detail.variantId },
          });
          if (variant) {
            variant.stock += restockQty;
            await variantRepository.save(variant);
          } else {
            console.warn(
              `Variant ${detail.variantId} not found for order detail ${detail.id}; skipping restock`,
            );
          }
        } else if (!detail.variantId && restockQty > 0) {
          console.warn(
            `Variant not stored for order detail ${detail.id}; skipping restock`,
          );
        }

        detail.returnedQuantity = detail.quantity;
        await detailRepository.save(detail);
      }

      current.status = 'cancelled';
      await orderRepository.save(current);

      updatedOrder = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['details', 'details.product', 'details.variant', 'user'],
      });
    });

    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    this.sendCancellationEmail(updatedOrder).catch((err) =>
      console.error('Failed to send cancellation email', err),
    );

    return updatedOrder;
  }

  private async attachPendingReturnQuantities(
    order: Order | null,
    userId?: number,
  ): Promise<Order | null> {
    if (!order?.details?.length) {
      return order;
    }
    const filterUserId =
      userId && order.user?.id === userId ? userId : undefined;
    const pendingItems = await this.returnRequestItemRepo.find({
      where: {
        request: {
          orderId: order.id,
          status: 'pending',
          ...(filterUserId ? { userId: filterUserId } : {}),
        },
      },
      relations: ['request'],
    });
    if (!pendingItems.length) {
      return order;
    }
    const pendingByDetail = new Map<number, number>();
    for (const pending of pendingItems) {
      const current = pendingByDetail.get(pending.orderDetailId) ?? 0;
      pendingByDetail.set(pending.orderDetailId, current + pending.quantity);
    }

    return {
      ...order,
      details: order.details.map((detail) => ({
        ...detail,
        pendingReturnQuantity: pendingByDetail.get(detail.id) ?? 0,
      })),
    };
  }

  async returnItems(
    orderId: number,
    userId: number,
    items: { detailId: number; quantity: number }[],
  ) {
    const order = await this.assertOrderOwnership(orderId, userId);
    const status = (order.status || '').toLowerCase();
    if (status === 'cancelled') {
      throw new BadRequestException('Cancelled orders cannot be returned');
    }
    if (!RETURN_ELIGIBLE_STATUSES.has(status)) {
      throw new BadRequestException(
        'This order cannot be returned',
      );
    }
    // Check 30-day return window
    this.assertWithinReturnWindow(order);
    return this.applyReturnItems(orderId, items);
  }

  async createReturnRequest(
    orderId: number,
    userId: number,
    items: { detailId: number; quantity: number }[],
    reason?: string,
  ) {
    const order = await this.assertOrderOwnership(orderId, userId);
    const status = (order.status || '').toLowerCase();
    if (status === 'cancelled') {
      throw new BadRequestException('Cancelled orders cannot be returned');
    }
    if (!RETURN_ELIGIBLE_STATUSES.has(status)) {
      throw new BadRequestException(
        'This order cannot be returned',
      );
    }
    // Check 30-day return window
    this.assertWithinReturnWindow(order);
    this.assertWithinReturnWindow(order);

    if (!items || items.length === 0) {
      throw new BadRequestException('Return items are required');
    }

    const pendingItems = await this.returnRequestItemRepo.find({
      where: { request: { orderId, status: 'pending' } },
      relations: ['request'],
    });

    const pendingByDetail = new Map<number, number>();
    for (const pending of pendingItems) {
      const current = pendingByDetail.get(pending.orderDetailId) ?? 0;
      pendingByDetail.set(pending.orderDetailId, current + pending.quantity);
    }

    const detailById = new Map<number, OrderDetail>();
    for (const detail of order.details ?? []) {
      detailById.set(detail.id, detail);
    }

    for (const item of items) {
      if (!item || item.quantity <= 0) {
        throw new BadRequestException('Return quantities must be positive');
      }
      const detail = detailById.get(item.detailId);
      if (!detail) {
        throw new NotFoundException(
          `Order detail ${item.detailId} not found on this order`,
        );
      }
      const alreadyReturned = detail.returnedQuantity ?? 0;
      const pendingQty = pendingByDetail.get(detail.id) ?? 0;
      const remaining = detail.quantity - alreadyReturned - pendingQty;
      if (item.quantity > remaining) {
        throw new BadRequestException(
          `Cannot request more than remaining for detail ${detail.id}`,
        );
      }
    }

    let created: ReturnRequest | null = null;

    const shippingCode = OrderService.generateReturnShippingCode();

    await this.orderRepo.manager.transaction(async (manager) => {
      const requestRepo = manager.getRepository(ReturnRequest);
      const requestItemRepo = manager.getRepository(ReturnRequestItem);

      const request = requestRepo.create({
        orderId,
        userId,
        status: 'pending',
        returnShippingCode: shippingCode,
        returnReason: reason?.trim() ? reason.trim() : null,
      });
      await requestRepo.save(request);

      const requestItems = items.map((item) =>
        requestItemRepo.create({
          requestId: request.id,
          orderDetailId: item.detailId,
          quantity: item.quantity,
        }),
      );
      await requestItemRepo.save(requestItems);

      created = await requestRepo.findOne({
        where: { id: request.id },
        relations: [
          'order',
          'user',
          'items',
          'items.orderDetail',
          'items.orderDetail.product',
          'items.orderDetail.variant',
        ],
      });
    });

    if (!created) {
      throw new NotFoundException('Return request could not be created');
    }
    return created;
  }

  async getAllReturnRequests() {
    return this.returnRequestRepo.find({
      order: { createdAt: 'DESC' },
      relations: [
        'order',
        'user',
        'items',
        'items.orderDetail',
        'items.orderDetail.product',
        'items.orderDetail.variant',
      ],
    });
  }

  async getReturnOrders() {
    const orders = await this.orderRepo.find({
      where: [{ status: 'cancelled' }, { status: 'returned' }, { status: 'partially_returned' }],
      order: { createdAt: 'DESC' },
      relations: ['details', 'details.product', 'details.variant', 'user'],
    });

    return orders.map((order) => {
      const normalizedDetails = (order.details || []).map((detail) => {
        const purchasedQty = detail.quantity ?? 0;
        const returnedQty =
          order.status === 'cancelled'
            ? purchasedQty
            : Math.min(purchasedQty, detail.returnedQuantity ?? 0);
        const unitPrice = this.coerceNumber(detail.price);
        const totalRefunded = this.roundCurrency(unitPrice * returnedQty);
        return {
          ...detail,
          quantity: purchasedQty,
          returnedQuantity: returnedQty,
          unitPrice,
          totalRefunded,
        };
      });

      return {
        ...order,
        details: normalizedDetails,
      };
    });
  }

  async updateReturnRequestStatus(
    requestId: number,
    status: ReturnRequestStatus,
  ) {
    const allowed: ReturnRequestStatus[] = ['approved', 'rejected'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid return request status');
    }

    const request = await this.returnRequestRepo.findOne({
      where: { id: requestId },
      relations: [
        'items',
        'items.orderDetail',
        'items.orderDetail.variant',
        'order',
        'user',
      ],
    });

    if (!request) {
      throw new NotFoundException('Return request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Return request already processed');
    }

    let updatedOrder: Order | null = null;

    if (status === 'approved') {
      const items = (request.items || []).map((item) => ({
        detailId: item.orderDetailId,
        quantity: item.quantity,
      }));
      updatedOrder = await this.applyReturnItems(request.orderId, items);
    }

    request.status = status;
    await this.returnRequestRepo.save(request);

    const refreshed = await this.returnRequestRepo.findOne({
      where: { id: request.id },
      relations: [
        'order',
        'user',
        'items',
        'items.orderDetail',
        'items.orderDetail.product',
        'items.orderDetail.variant',
      ],
    });

    if (status === 'approved' && updatedOrder) {
      this.sendRefundApprovedEmail(updatedOrder, request.items || []).catch(
        (err) => console.error('Failed to send refund approval email', err),
      );
    }

    return refreshed;
  }

  private async applyReturnItems(
    orderId: number,
    items: { detailId: number; quantity: number }[],
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Return items are required');
    }

    let updated: Order | null = null;

    await this.orderRepo.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const detailRepository = manager.getRepository(OrderDetail);
      const variantRepository = manager.getRepository(ProductVariant);

      const current = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['details', 'details.variant', 'user'],
      });
      if (!current) throw new NotFoundException('Order not found');
      if (current.status === 'cancelled') {
        throw new BadRequestException('Cancelled orders cannot be returned');
      }
      const normalizedStatus = (current.status || '').toLowerCase();
      if (!RETURN_ELIGIBLE_STATUSES.has(normalizedStatus)) {
        throw new BadRequestException(
          'This order cannot be returned',
        );
      }
      // Check 30-day return window
      this.assertWithinReturnWindow(current);

      for (const item of items) {
        if (!item || item.quantity <= 0) {
          throw new BadRequestException('Return quantities must be positive');
        }
        const detail = current.details?.find((d) => d.id === item.detailId);
        if (!detail) {
          throw new NotFoundException(
            `Order detail ${item.detailId} not found on this order`,
          );
        }
        const alreadyReturned = detail.returnedQuantity ?? 0;
        const remaining = detail.quantity - alreadyReturned;
        if (item.quantity > remaining) {
          throw new BadRequestException(
            `Cannot return more than purchased for detail ${detail.id}`,
          );
        }
        if (!detail.variantId) {
          console.warn(
            `Variant not stored for order detail ${detail.id}; skipping restock`,
          );
          detail.returnedQuantity = alreadyReturned + item.quantity;
          await detailRepository.save(detail);
          continue;
        }
        const variant = await variantRepository.findOne({
          where: { id: detail.variantId },
        });
        if (!variant) {
          console.warn(
            `Variant ${detail.variantId} not found for order detail ${detail.id}; skipping restock`,
          );
          detail.returnedQuantity = alreadyReturned + item.quantity;
          await detailRepository.save(detail);
          continue;
        }

        detail.returnedQuantity = alreadyReturned + item.quantity;
        await detailRepository.save(detail);

        variant.stock += item.quantity;
        await variantRepository.save(variant);
      }

      const allReturned = current.details?.every(
        (d) => (d.returnedQuantity ?? 0) >= d.quantity,
      );
      current.status = allReturned ? 'returned' : 'partially_returned';
      await orderRepository.save(current);

      updated = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['details', 'details.product', 'details.variant', 'user'],
      });
    });

    if (!updated) {
      throw new NotFoundException('Order not found');
    }
    return updated;
  }

  private assertWithinReturnWindow(order: Order) {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (!createdAt) return;
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const maxMs = 30 * 24 * 60 * 60 * 1000;
    if (diffMs > maxMs) {
      throw new BadRequestException('Return window (30 days) has expired');
    }
  }

  private formatMoney(value: number | string | null | undefined) {
    const amount = this.coerceNumber(value);
    return `${amount.toFixed(2)} TL`;
  }

  private async sendRefundApprovedEmail(
    order: Order,
    items: ReturnRequestItem[],
  ) {
    const to = order.contactEmail || order.user?.email;
    if (!to) return;

    const lines: string[] = [];
    let totalRefunded = 0;

    const detailLookup = new Map<number, OrderDetail>();
    for (const d of order.details ?? []) {
      detailLookup.set(d.id, d);
    }

    for (const item of items) {
      const detail = detailLookup.get(item.orderDetailId);
      if (!detail) continue;
      const productName = detail.product?.name || 'Product';
      const unitPrice = this.coerceNumber(detail.price);
      const paidPrice = detail.product?.price
        ? this.coerceNumber(detail.product.price)
        : unitPrice;
      const discountApplied =
        paidPrice > unitPrice ? `${((1 - unitPrice / paidPrice) * 100).toFixed(0)}%` : '—';
      const lineTotal = this.roundCurrency(unitPrice * item.quantity);
      totalRefunded += lineTotal;
      lines.push(
        `- ${productName}: qty ${item.quantity} × ${this.formatMoney(
          unitPrice,
        )} (discount: ${discountApplied}) = ${this.formatMoney(lineTotal)}`,
      );
    }

    const body = [
      `Hello ${order.user?.name || order.contactName || 'customer'},`,
      '',
      `Your refund request for Order #${order.id} has been approved.`,
      '',
      'Refunded products:',
      ...lines,
      '',
      `Total refunded amount: ${this.formatMoney(totalRefunded)}`,
      '',
      'Refunded to your original payment method.',
      '',
      'Thank you,',
      'MKN Store',
    ].join('\n');

    await this.mailService
      .sendMail({
        to,
        from:
          process.env.MAIL_FROM ||
          process.env.SMTP_FROM ||
          process.env.MAIL_USER ||
          'mkn.store308@gmail.com',
        subject: 'Your Refund Has Been Approved – MKN Store',
        text: body,
      })
      .catch((err) => console.error('Mail send failed', err));
  }

  private async sendCancellationEmail(order: Order) {
    const to = order.contactEmail || order.user?.email;
    if (!to) return;

    const lines: string[] = [];
    let totalRefunded = 0;

    for (const detail of order.details ?? []) {
      const qty = detail.quantity;
      const unitPrice = this.coerceNumber(detail.price);
      const lineTotal = this.roundCurrency(unitPrice * qty);
      totalRefunded += lineTotal;
      lines.push(
        `- ${detail.product?.name || 'Product'}: qty ${qty} × ${this.formatMoney(
          unitPrice,
        )} = ${this.formatMoney(lineTotal)}`,
      );
    }

    const body = [
      `Hello ${order.user?.name || order.contactName || 'customer'},`,
      '',
      `Your Order #${order.id} has been cancelled.`,
      '',
      'Cancelled products:',
      ...lines,
      '',
      `Total refunded amount: ${this.formatMoney(totalRefunded)}`,
      '',
      'Refunded to your original payment method.',
      '',
      'Thank you,',
      'MKN Store',
    ].join('\n');

    await this.mailService
      .sendMail({
        to,
        from:
          process.env.MAIL_FROM ||
          process.env.SMTP_FROM ||
          process.env.MAIL_USER ||
          'mkn.store308@gmail.com',
        subject: 'Your Order Has Been Cancelled – MKN Store',
        text: body,
      })
      .catch((err) => console.error('Mail send failed', err));
  }

  private coerceNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private resolveEffectivePrice(
    product?: Product | null,
    fallback?: number | string | null,
  ): number {
    const basePrice = this.coerceNumber(product?.price ?? fallback ?? 0);
    const discountedRaw = product?.discountedPrice;
    const discounted =
      discountedRaw === null || discountedRaw === undefined
        ? null
        : this.coerceNumber(discountedRaw);
    if (discounted !== null) {
      return discounted;
    }
    const discountRate = this.coerceNumber(product?.discountRate ?? 0);
    if (discountRate > 0) {
      const discountedPrice = basePrice * ((100 - discountRate) / 100);
      return Math.max(0, this.roundCurrency(discountedPrice));
    }
    return basePrice;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private static generateReturnShippingCode(): string {
    const min = 100000;
    const max = 999999;
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(value);
  }
}
