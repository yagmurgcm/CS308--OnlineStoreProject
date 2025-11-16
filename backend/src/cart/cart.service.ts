import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { ProductVariant } from '../product/product-variant.entity';
import { User } from '../users/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  private readonly cartRelations: string[] = [
    'items',
    'items.variant',
    'items.variant.product',
  ];

  private async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: this.cartRelations,
    });
    if (!cart) {
      const userRef = { id: userId } as User;
      cart = this.cartRepo.create({ user: userRef, items: [] });
      cart = await this.cartRepo.save(cart);
    }
    cart = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: this.cartRelations,
    });
    if (!cart) {
      throw new NotFoundException('Cart could not be loaded');
    }
    return cart;
  }

  async getCart(userId: number): Promise<Cart> {
    return this.getOrCreateCart(userId);
  }

  async addItem(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<Cart> {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be >= 1');
    }

    const [cart, variant] = await Promise.all([
      this.getOrCreateCart(userId),
      this.variantRepo.findOne({
        where: { id: variantId },
        relations: ['product'],
      }),
    ]);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.stock < quantity) {
      throw new BadRequestException(
        'Requested quantity exceeds stock for this variant',
      );
    }

    const existing = (cart.items || []).find((i) => i.variant.id === variantId);
    if (existing) {
      if (variant.stock < existing.quantity + quantity) {
        throw new BadRequestException(
          'Requested quantity exceeds stock for this variant',
        );
      }
      existing.quantity += quantity;
      await this.itemRepo.save(existing);
    } else {
      const item = this.itemRepo.create({ cart, variant, quantity });
      await this.itemRepo.save(item);
    }
    return this.getCart(userId);
  }

  async updateItem(
    userId: number,
    itemId: number,
    quantity: number,
  ): Promise<Cart> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user', 'variant'],
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }
    if (item.cart.user.id !== userId) {
      throw new ForbiddenException('Not your cart');
    }

    if (quantity <= 0) {
      await this.itemRepo.remove(item);
    } else {
      if (item.variant.stock < quantity) {
        throw new BadRequestException(
          'Requested quantity exceeds stock for this variant',
        );
      }
      item.quantity = quantity;
      await this.itemRepo.save(item);
    }
    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user'],
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }
    if (item.cart.user.id !== userId) {
      throw new ForbiddenException('Not your cart');
    }

    await this.itemRepo.remove(item);
    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items?.length) {
      await this.itemRepo.remove(cart.items);
    }
    return this.getCart(userId);
  }
}
