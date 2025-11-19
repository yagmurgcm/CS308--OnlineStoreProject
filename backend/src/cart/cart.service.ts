import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ProductVariant } from '../product/product-variant.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
  ) {}

  // 🔥 Kullanıcının sepetini getirir
  private findCart(userId: number): Promise<Cart | null> {
    return this.cartRepo.findOne({
      where: { userId },
      relations: ['items', 'items.variant'],
    });
  }

  private resolveVariantId(payload: { variantId?: number; productId?: number }): number {
    const variantId = payload.variantId ?? payload.productId;
    if (!variantId) {
      throw new BadRequestException('variantId is required');
    }

    return variantId;
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
    const variantId = this.resolveVariantId(dto);

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
    const variantId = this.resolveVariantId(dto);

    const item = await this.cartItemRepo.findOne({
      where: {
        cart: { id: cart.id },
        variant: { id: variantId },
      },
    });

    if (!item) throw new NotFoundException('Ürün sepette bulunamadı');

    item.quantity = dto.quantity;

    await this.cartItemRepo.save(item);

    return (await this.findCart(userId))!;
  }

  // 🔥 ÜRÜN SİLME
  async removeItem(userId: number, variantId: number): Promise<Cart> {
    const cart = await this.ensureCart(userId);

    const item = await this.cartItemRepo.findOne({
      where: {
        cart: { id: cart.id },
        variant: { id: variantId },
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
