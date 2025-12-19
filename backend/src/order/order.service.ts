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

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,

    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,

    private readonly cartService: CartService,
    private readonly usersService: UsersService,
    private readonly invoiceService: InvoiceService,
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
    Promise.resolve(
      this.invoiceService.sendInvoiceEmail(finalizedOrder.id, {
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
      }),
    ).catch((err) => {
      console.error('Failed to send invoice email', err);
    });

    return finalizedOrder;
  }

  async getOrdersByUser(userId: number) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['details', 'details.product', 'details.variant'],
    });
  }

  async getOrderById(id: number) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['details', 'details.product', 'details.variant', 'user'],
    });
  }

  async assertOrderOwnership(orderId: number, requesterId: number) {
    const order = await this.getOrderById(orderId);
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

    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    
    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    order.status = newStatus;
    await this.orderRepo.save(order);

    console.log(`✅ Order #${orderId} status updated to: ${newStatus}`);
    
    return this.getOrderById(orderId);
  }

  async cancelOrder(orderId: number, userId: number) {
    const order = await this.assertOrderOwnership(orderId, userId);
    if (order.status === 'cancelled') {
      throw new BadRequestException('Order already cancelled');
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

      for (const detail of current.details ?? []) {
        const alreadyReturned = detail.returnedQuantity ?? 0;
        const remaining = detail.quantity - alreadyReturned;
        if (remaining <= 0) continue;

        if (!detail.variantId) {
          throw new NotFoundException(
            `Variant not stored for order detail ${detail.id}`,
          );
        }
        const variant = await variantRepository.findOne({
          where: { id: detail.variantId },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant ${detail.variantId} not found for order detail ${detail.id}`,
          );
        }
        variant.stock += remaining;
        await variantRepository.save(variant);
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
    return updatedOrder;
  }

  async returnItems(
    orderId: number,
    userId: number,
    items: { detailId: number; quantity: number }[],
  ) {
    const order = await this.assertOrderOwnership(orderId, userId);
    if (order.status === 'cancelled') {
      throw new BadRequestException('Cancelled orders cannot be returned');
    }

    const detailMap = new Map<number, OrderDetail>();
    for (const d of order.details ?? []) {
      detailMap.set(d.id, d);
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

      for (const item of items) {
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
          throw new NotFoundException(
            `Variant not stored for order detail ${detail.id}`,
          );
        }
        const variant = await variantRepository.findOne({
          where: { id: detail.variantId },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant ${detail.variantId} not found for order detail ${detail.id}`,
          );
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
}
