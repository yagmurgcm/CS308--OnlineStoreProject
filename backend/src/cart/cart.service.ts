import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ProductVariant } from '../product/product-variant.entity';
import { Product } from '../product/entities/product.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // 🔥 Kullanıcının sepetini getirir
  private findCart(userId: number): Promise<Cart | null> {
    return this.cartRepo.findOne({
      where: { userId },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });
  }

  private async resolveVariantId(payload: {
    variantId?: number;
    productId?: number;
  }): Promise<number> {
    if (payload.variantId) {
      return payload.variantId;
    }

    if (payload.productId) {
      const variant = await this.variantRepo.findOne({
        where: { product: { id: payload.productId } },
        order: { id: 'ASC' },
      });
      if (!variant) {
        const product = await this.productRepo.findOne({
          where: { id: payload.productId },
        });
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        const fallbackVariant = this.variantRepo.create({
          product,
          color: 'Standard',
          size: 'Standard',
          price: product.price ?? 0,
          stock: product.stock ?? 0,
        });
        const saved = await this.variantRepo.save(fallbackVariant);
        return saved.id;
      }
      return variant.id;
    }

    throw new BadRequestException('variantId or productId is required');
  }

  // 🔥 Sepeti yoksa otomatik oluşturur
  private async ensureCart(userId: number): Promise<Cart> {
    let cart = await this.findCart(userId);
    if (cart) return cart;

    cart = this.cartRepo.create({ userId });
    await this.cartRepo.save(cart);

    return (await this.findCart(userId))!;
  }

  // 🔥 PUBLIC: sepeti getir
  async getCart(userId: number): Promise<Cart> {
    return this.ensureCart(userId);
  }

  // 🔥 ÜRÜN EKLEME
  async addItem(userId: number, dto: AddItemDto): Promise<Cart> {
    const cart = await this.ensureCart(userId);
    const variantId = await this.resolveVariantId(dto);

    let item = await this.cartItemRepo.findOne({
      where: {
        cart: { id: cart.id },
        variant: { id: variantId },
      },
    });

    if (item) {
      // ürün zaten sepette → quantity artır
      item.quantity += dto.quantity;
    } else {
      // yeni ürün satırı oluştur
      item = this.cartItemRepo.create({
        variant: { id: variantId } as ProductVariant,
        quantity: dto.quantity,
        cart,
      });
    }

    await this.cartItemRepo.save(item);

    return (await this.findCart(userId))!;
  }

  // 🔥 ÜRÜN ADETİNİ GÜNCELLEME
  async updateItem(userId: number, dto: UpdateItemDto): Promise<Cart> {
    const cart = await this.ensureCart(userId);
    let item: CartItem | null = null;

    if (dto.itemId) {
      item = await this.cartItemRepo.findOne({
        where: {
          id: dto.itemId,
          cart: { id: cart.id },
        },
      });
    } else {
      const variantId = await this.resolveVariantId(dto);
      item = await this.cartItemRepo.findOne({
        where: {
          cart: { id: cart.id },
          variant: { id: variantId },
        },
      });
    }

    if (!item) throw new NotFoundException('Ürün sepette bulunamadı');

    item.quantity = dto.quantity;

    await this.cartItemRepo.save(item);

    return (await this.findCart(userId))!;
  }

  // 🔥 ÜRÜN SİLME
  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const cart = await this.ensureCart(userId);

    const item = await this.cartItemRepo.findOne({
      where: {
        id: itemId,
        cart: { id: cart.id },
      },
    });

    if (!item) {
      throw new NotFoundException('Ürün sepette yok veya erişim izni yok');
    }

    await this.cartItemRepo.delete(item.id);

    return (await this.findCart(userId))!;
  }

  // 🔥 SEPETİ TEMİZLEME
  async clear(userId: number): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) return;

    await this.cartItemRepo.delete({ cart: { id: cart.id } });
  }
}
