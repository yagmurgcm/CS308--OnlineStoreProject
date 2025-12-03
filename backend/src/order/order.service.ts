import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { ProductVariant } from '../product/product-variant.entity';

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
  ) {}

  // ---------------------------------------
  // ✔ CHECKOUT
  // ---------------------------------------
  async checkout(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const cart = await this.cartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    const order = this.orderRepo.create({
      user,
      status: 'pending',
      totalPrice: 0,
    });

    const details: OrderDetail[] = [];

    for (const item of cart.items) {
      // 🔥 artık productId yok → variant üzerinden gidiyoruz
      const variant = await this.variantRepo.findOne({
        where: { id: item.variant.id },
        relations: ['product'],
      });

      if (!variant) {
        throw new NotFoundException(`Variant ${item.variant.id} not found`);
      }

      const price = Number(variant.price);
      order.totalPrice += price * item.quantity;

      const detail = this.detailRepo.create({
        order,
        product: variant.product, // 🔥 ürün = variant.product
        quantity: item.quantity,
        price,
      });

      details.push(detail);
    }

    await this.orderRepo.save(order);
    if (details.length) {
      await this.detailRepo.save(details);
    }

    await this.cartService.clear(userId);

    return order;
  }

  async getOrdersByUser(userId: number) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['details', 'details.product'],
    });
  }

  async getOrderById(id: number) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['details', 'details.product'],
    });
  }
}
