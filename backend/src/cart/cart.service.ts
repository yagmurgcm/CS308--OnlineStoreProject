import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../product/product.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  private async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({ where: { user: { id: userId } } });
    if (!cart) {
      cart = this.cartRepo.create({ user: { id: userId } as any, items: [] });
      cart = await this.cartRepo.save(cart);
    }
    // ensure items are loaded eagerly
    cart = await this.cartRepo.findOne({ where: { id: cart.id } });
    return cart!;
  }

  async getCart(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    return cart;
  }

  async addItem(userId: number, productId: number, quantity: number): Promise<Cart> {
    if (quantity < 1) throw new BadRequestException('Quantity must be >= 1');

    const [cart, product] = await Promise.all([
      this.getOrCreateCart(userId),
      this.productRepo.findOne({ where: { id: productId } }),
    ]);
    if (!product) throw new NotFoundException('Product not found');

    const existing = (cart.items || []).find((i) => i.product.id === productId);
    if (existing) {
      existing.quantity += quantity;
      await this.itemRepo.save(existing);
    } else {
      const item = this.itemRepo.create({ cart, product, quantity });
      await this.itemRepo.save(item);
    }
    return await this.getCart(userId);
  }

  async updateItem(userId: number, itemId: number, quantity: number): Promise<Cart> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user'],
    });
    if (!item) throw new NotFoundException('Item not found');
    if ((item.cart as any).user.id !== userId) throw new ForbiddenException('Not your cart');

    if (quantity <= 0) {
      await this.itemRepo.remove(item);
    } else {
      item.quantity = quantity;
      await this.itemRepo.save(item);
    }
    return await this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user'],
    });
    if (!item) throw new NotFoundException('Item not found');
    if ((item.cart as any).user.id !== userId) throw new ForbiddenException('Not your cart');

    await this.itemRepo.remove(item);
    return await this.getCart(userId);
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items?.length) {
      await this.itemRepo.remove(cart.items);
    }
    return await this.getCart(userId);
  }
}

