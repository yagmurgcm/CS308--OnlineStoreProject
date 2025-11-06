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
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
  ) {}

  private async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items'],
    });
    if (!cart) {
      cart = this.cartRepo.create({ userId, items: [] });
      cart = await this.cartRepo.save(cart);
    }
    // items dolu halde dön
    if (!cart.items) {
      cart = await this.cartRepo.findOne({ where: { userId }, relations: ['items'] }) as Cart;
    }
    return cart;
  }

  async getCart(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    return cart;
  }

  async addItem(userId: number, dto: AddItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Aynı üründen varsa miktarı arttır
    const existing = cart.items?.find((i) => i.productId === dto.productId);
    if (existing) {
      existing.quantity += dto.quantity;
      await this.itemRepo.save(existing);
      return this.getCart(userId);
    }

    const item = this.itemRepo.create({
      productId: dto.productId,
      quantity: dto.quantity,
      cart,
    });
    await this.itemRepo.save(item);
    return this.getCart(userId);
  }

  async updateItem(userId: number, dto: UpdateItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items?.find((i) => i.id === dto.itemId);
    if (!item) throw new NotFoundException('Item not found');
    item.quantity = dto.quantity;
    await this.itemRepo.save(item);
    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items?.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item not found');
    await this.itemRepo.delete(item.id);
    return this.getCart(userId);
  }

  async clear(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    await this.itemRepo.delete({ cart: { id: cart.id } as any });
    return this.getCart(userId);
  }
}
