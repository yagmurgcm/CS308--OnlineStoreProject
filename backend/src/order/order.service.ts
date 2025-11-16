import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,

    private readonly cartService: CartService,
    private readonly usersService: UsersService,
  ) {}

  // ---------------------------------------
  // ✔ CHECKOUT (Creates Order + Details)
  // ---------------------------------------
  async checkout(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const cart = await this.cartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // 👉 Total price is calculated manually because Cart has no totalPrice field
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    // Create main order
    const order = this.orderRepo.create({
      user,
      cart,
      totalPrice,
      status: 'pending',
    });

    await this.orderRepo.save(order);

    // Create order details
    for (const item of cart.items) {
      const detail = this.detailRepo.create({
        order,
        product: item.product,
        quantity: item.quantity,
        price: item.product.price,
      });

      await this.detailRepo.save(detail);
    }

    // Clear cart after ordering
    await this.cartService.clearCart(userId);

    return order;
  }

  // ---------------------------------------
  // ✔ Get all orders for a user
  // ---------------------------------------
  async getOrdersByUser(userId: number) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  // ---------------------------------------
  // ✔ Get a single order by ID
  // ---------------------------------------
  async getOrderById(id: number) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
  }
}
