import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ProductVariant } from '../product/product-variant.entity';
import { Product } from '../product/entities/product.entity';

type CartOwner =
  | { kind: 'user'; userId: number }
  | { kind: 'guest'; guestToken: string };

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

  // 🔥 Kullanıcının sepetini getirir (Varyant detaylarıyla birlikte)
  private getOwnerWhere(owner: CartOwner) {
    return owner.kind === 'user'
      ? { userId: owner.userId }
      : { guestToken: owner.guestToken };
  }

  private async findCart(
    owner: CartOwner,
    manager?: EntityManager,
  ): Promise<Cart | null> {
    const repo = manager ? manager.getRepository(Cart) : this.cartRepo;
    return repo.findOne({
      where: this.getOwnerWhere(owner),
      relations: ['items', 'items.variant', 'items.variant.product'],
      order: {
        items: { id: 'ASC' },
      },
    });
  }

  // 🔥 LOGLU VARYANT ÇÖZÜCÜ (HATAYI BURASI YAKALAYACAK)
  private async resolveVariantId(payload: {
    variantId?: number;
    productId?: number;
    color?: string;
    size?: string;
  }): Promise<number> {
    // --- 🕵️‍♂️ LOG BAŞLANGICI ---
    console.log('\n--- 🛒 SEPETE EKLEME İSTEĞİ GELDİ ---');
    console.log('📦 Gelen Payload:', JSON.stringify(payload, null, 2));

    if (payload.variantId) {
      const variant = await this.variantRepo.findOne({
        where: { id: payload.variantId },
      });
      if (!variant) {
        throw new BadRequestException('Variant not found');
      }
      console.log('✅ Direkt Variant ID kullanılıyor:', payload.variantId);
      return variant.id;
    }

    if (payload.productId) {
      if (payload.color && payload.size) {
        console.log(
          `🔎 Arama Yapılıyor -> ProductID: ${payload.productId}, Renk: '${payload.color}', Beden: '${payload.size}'`,
        );

        const specificVariant = await this.variantRepo.findOne({
          where: {
            product: { id: payload.productId },
            color: payload.color,
            size: payload.size,
          },
        });

        if (specificVariant) {
          console.log(
            '✅ TAM EŞLEŞME BULUNDU! Variant ID:',
            specificVariant.id,
          );
          return specificVariant.id;
        } else {
          console.warn(
            '⚠️ DİKKAT: Veritabanında bu renk/beden kombinasyonu BULUNAMADI!',
          );
          console.warn(
            "👉 Olası Sebepler: Harf büyüklüğü (M vs m), Boşluklar ('Red ' vs 'Red') veya veritabanında bu varyant hiç yok.",
          );
          // Buradan sonra kod aşağı akacak ve varsayılanı seçecek. Terminalde bu uyarıyı görürsen veritabanını düzeltmen lazım.
        }
      } else {
        console.warn(
          '⚠️ Renk veya Beden bilgisi EKSİK geldi. Varsayılan varyanta gidiliyor.',
        );
      }

      // Fallback (Varsayılan davranış)
      console.log(
        'ℹ️ Fallback: İlk bulunan varyant veya varsayılan varyant atanacak.',
      );
      const variant = await this.variantRepo.findOne({
        where: { product: { id: payload.productId } },
        order: { id: 'ASC' },
      });

      if (!variant) {
        console.log('ℹ️ Hiç varyant yok, yapay varyant oluşturuluyor...');
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

      console.log('✅ Varsayılan Varyant ID:', variant.id);
      return variant.id;
    }

    throw new BadRequestException('variantId or productId is required');
  }

  // 🔥 Sepeti yoksa oluştur, varsa getir
  private async ensureCart(
    owner: CartOwner,
    manager?: EntityManager,
  ): Promise<Cart> {
    let cart = await this.findCart(owner, manager);
    if (cart) return cart;

    const repo = manager ? manager.getRepository(Cart) : this.cartRepo;
    cart =
      owner.kind === 'user'
        ? repo.create({ userId: owner.userId })
        : repo.create({ guestToken: owner.guestToken });
    await repo.save(cart);

    return (await this.findCart(owner, manager))!;
  }

  // 🔥 PUBLIC: Sepeti Getir
  async getCart(userId: number): Promise<Cart> {
    return this.ensureCart({ kind: 'user', userId });
  }

  async getGuestCart(guestToken: string): Promise<Cart> {
    return this.ensureCart({ kind: 'guest', guestToken });
  }

  async createGuestCart(): Promise<Cart> {
    const guestToken = randomUUID();
    const cart = this.cartRepo.create({ guestToken });
    await this.cartRepo.save(cart);
    return (await this.findCart({ kind: 'guest', guestToken }))!;
  }

  private async addItemForOwner(
    owner: CartOwner,
    dto: AddItemDto,
  ): Promise<Cart> {
    const cart = await this.ensureCart(owner);

    const variantId = await this.resolveVariantId({
      productId: dto.productId,
      variantId: dto.variantId,
      color: dto.color,
      size: dto.size,
    });

    let item = await this.cartItemRepo.findOne({
      where: {
        cart: { id: cart.id },
        variant: { id: variantId },
      },
    });

    if (item) {
      console.log(
        `🔄 Ürün zaten sepette (Mevcut: ${item.quantity}), miktar artırılıyor.`,
      );
      item.quantity += dto.quantity;
    } else {
      console.log('✨ Yeni satır oluşturuluyor.');
      item = this.cartItemRepo.create({
        variant: { id: variantId } as ProductVariant,
        quantity: dto.quantity,
        cart,
      });
    }

    await this.cartItemRepo.save(item);
    return (await this.findCart(owner))!;
  }

  // 🔥 ÜRÜN EKLE
  async addItem(userId: number, dto: AddItemDto): Promise<Cart> {
    return this.addItemForOwner({ kind: 'user', userId }, dto);
  }

  async addItemForGuest(guestToken: string, dto: AddItemDto): Promise<Cart> {
    return this.addItemForOwner({ kind: 'guest', guestToken }, dto);
  }

  private async updateItemForOwner(
    owner: CartOwner,
    dto: UpdateItemDto,
  ): Promise<Cart> {
    const cart = await this.ensureCart(owner);
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

    return (await this.findCart(owner))!;
  }

  // 🔥 ÜRÜN GÜNCELLE
  async updateItem(userId: number, dto: UpdateItemDto): Promise<Cart> {
    return this.updateItemForOwner({ kind: 'user', userId }, dto);
  }

  async updateGuestItem(guestToken: string, dto: UpdateItemDto): Promise<Cart> {
    return this.updateItemForOwner({ kind: 'guest', guestToken }, dto);
  }

  private async removeItemForOwner(
    owner: CartOwner,
    itemId: number,
  ): Promise<Cart> {
    const cart = await this.ensureCart(owner);

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
    return (await this.findCart(owner))!;
  }

  // 🔥 ÜRÜN SİL
  async removeItem(userId: number, itemId: number): Promise<Cart> {
    return this.removeItemForOwner({ kind: 'user', userId }, itemId);
  }

  async removeGuestItem(guestToken: string, itemId: number): Promise<Cart> {
    return this.removeItemForOwner({ kind: 'guest', guestToken }, itemId);
  }

  private async clearOwnerCart(owner: CartOwner): Promise<void> {
    const cart = await this.cartRepo.findOne({
      where: this.getOwnerWhere(owner),
    });
    if (!cart) return;

    await this.cartItemRepo.delete({ cart: { id: cart.id } });
  }

  // 🔥 SEPETİ BOŞALT
  async clear(userId: number): Promise<void> {
    await this.clearOwnerCart({ kind: 'user', userId });
  }

  async clearGuestCart(guestToken: string): Promise<void> {
    await this.clearOwnerCart({ kind: 'guest', guestToken });
  }

  async removeVariantQuantity(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.ensureCart({ kind: 'user', userId });

    const item = await this.cartItemRepo.findOne({
      where: {
        cart: { id: cart.id },
        variant: { id: variantId },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity >= item.quantity) {
      await this.cartItemRepo.delete(item.id);
    } else {
      item.quantity -= quantity;
      await this.cartItemRepo.save(item);
    }

    return (await this.findCart({ kind: 'user', userId }))!;
  }

  private buildItemKey(item: CartItem): string {
    const variantId = item.variant?.id ?? 'none';
    const productId = item.variant?.product?.id ?? 'none';
    return `${productId}:${variantId}`;
  }

  async mergeGuestCart(userId: number, guestToken: string): Promise<Cart> {
    await this.cartRepo.manager.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const cartItemRepository = manager.getRepository(CartItem);

      const guestCart = await cartRepository.findOne({
        where: { guestToken },
        relations: ['items', 'items.variant', 'items.variant.product'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!guestCart || guestCart.items.length === 0) {
        if (guestCart) {
          await cartRepository.delete(guestCart.id);
        }
        return;
      }

      let userCart = await cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.variant', 'items.variant.product'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!userCart) {
        userCart = cartRepository.create({ userId });
        await cartRepository.save(userCart);
        userCart = await cartRepository.findOne({
          where: { id: userCart.id },
          relations: ['items', 'items.variant', 'items.variant.product'],
          lock: { mode: 'pessimistic_write' },
        });
      }

      if (!userCart) {
        throw new NotFoundException('User cart could not be created');
      }

      const userMap = new Map<string, CartItem>();
      (userCart.items ?? []).forEach((item) => {
        userMap.set(this.buildItemKey(item), item);
      });

      for (const guestItem of guestCart.items) {
        const key = this.buildItemKey(guestItem);
        const existing = userMap.get(key);

        if (existing) {
          existing.quantity += guestItem.quantity;
          await cartItemRepository.save(existing);
        } else {
          if (!guestItem.variant) {
            console.warn(
              'Skipping guest cart item without variant during merge',
            );
            continue;
          }
          const newItem = cartItemRepository.create({
            cart: userCart,
            quantity: guestItem.quantity,
            variant: { id: guestItem.variant.id } as ProductVariant,
          });
          await cartItemRepository.save(newItem);
          userMap.set(key, newItem);
        }
      }

      await cartRepository.delete(guestCart.id);
    });

    const mergedCart = await this.findCart({ kind: 'user', userId });
    return mergedCart ?? (await this.ensureCart({ kind: 'user', userId }));
  }
}
