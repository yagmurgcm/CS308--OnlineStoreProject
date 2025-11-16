import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
  ) {}

  private findCart(userId: number): Promise<Cart | null> {
    return this.cartRepo.findOne({
      where: { userId },
      relations: ['items'],
    });
  }

  private async ensureCart(userId: number): Promise<Cart> {
    const existing = await this.findCart(userId);
    if (existing) return existing;

    const created = this.cartRepo.create({ userId, items: [] });
    await this.cartRepo.save(created);
    // Reload with relations to return consistent shape
    return (await this.findCart(userId)) as Cart;
  }

  async getCart(userId: number): Promise<Cart | null> {
    return this.findCart(userId);
  }

  async addItem(userId: number, dto: AddItemDto): Promise<Cart> {
    const cart = await this.ensureCart(userId);

    let item = await this.cartItemRepo.findOne({
      where: { cart: { id: cart.id }, productId: dto.productId },
    });

    if (item) {
      item.quantity += dto.quantity;
    } else {
      item = this.cartItemRepo.create({
        cart,
        productId: dto.productId,
        quantity: dto.quantity,
      });
    }

    await this.cartItemRepo.save(item);
    return (await this.findCart(userId)) as Cart;
  }

  async updateItem(userId: number, dto: UpdateItemDto): Promise<Cart> {
    const cart = await this.ensureCart(userId);

    const item = await this.cartItemRepo.findOne({
      where: { id: dto.itemId, cart: { id: cart.id } },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = dto.quantity;
    await this.cartItemRepo.save(item);

    return (await this.findCart(userId)) as Cart;
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const item = await this.cartItemRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });

    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepo.delete(item.id);
    return (await this.findCart(userId)) as Cart;
  }

  async clear(userId: number): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) return;

    await this.cartItemRepo.delete({ cart: { id: cart.id } });
  }
}
