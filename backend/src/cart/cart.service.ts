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

  // 🔥 Kullanıcının sepetini getirir (Varyant detaylarıyla birlikte)
  // 🔥 GÜÇLENDİRİLMİŞ SORGULU FIND CART
 // 🔥 STANDART VE TEMİZ FIND CART
  private async findCart(userId: number): Promise<Cart | null> {
    return this.cartRepo.findOne({
      where: { userId },
      // eager: true olduğu için relations yazmasak bile gelir ama garanti olsun diye yazalım:
      relations: ['items', 'items.variant', 'items.variant.product'], 
      order: {
        items: { id: 'ASC' }
      }
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
    console.log("\n--- 🛒 SEPETE EKLEME İSTEĞİ GELDİ ---");
    console.log("📦 Gelen Payload:", JSON.stringify(payload, null, 2));

    if (payload.variantId) {
        console.log("✅ Direkt Variant ID kullanılıyor:", payload.variantId);
        return payload.variantId;
    }

    if (payload.productId) {
      if (payload.color && payload.size) {
        console.log(`🔎 Arama Yapılıyor -> ProductID: ${payload.productId}, Renk: '${payload.color}', Beden: '${payload.size}'`);
        
        const specificVariant = await this.variantRepo.findOne({
            where: {
                product: { id: payload.productId },
                color: payload.color,
                size: payload.size
            }
        });

        if (specificVariant) {
            console.log("✅ TAM EŞLEŞME BULUNDU! Variant ID:", specificVariant.id);
            return specificVariant.id;
        } else {
            console.warn("⚠️ DİKKAT: Veritabanında bu renk/beden kombinasyonu BULUNAMADI!");
            console.warn("👉 Olası Sebepler: Harf büyüklüğü (M vs m), Boşluklar ('Red ' vs 'Red') veya veritabanında bu varyant hiç yok.");
            // Buradan sonra kod aşağı akacak ve varsayılanı seçecek. Terminalde bu uyarıyı görürsen veritabanını düzeltmen lazım.
        }
      } else {
          console.warn("⚠️ Renk veya Beden bilgisi EKSİK geldi. Varsayılan varyanta gidiliyor.");
      }

      // Fallback (Varsayılan davranış)
      console.log("ℹ️ Fallback: İlk bulunan varyant veya varsayılan varyant atanacak.");
      const variant = await this.variantRepo.findOne({
        where: { product: { id: payload.productId } },
        order: { id: 'ASC' },
      });

      if (!variant) {
        console.log("ℹ️ Hiç varyant yok, yapay varyant oluşturuluyor...");
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
      
      console.log("✅ Varsayılan Varyant ID:", variant.id);
      return variant.id;
    }

    throw new BadRequestException('variantId or productId is required');
  }

  // 🔥 Sepeti yoksa oluştur, varsa getir
  private async ensureCart(userId: number): Promise<Cart> {
    let cart = await this.findCart(userId);
    if (cart) return cart;

    cart = this.cartRepo.create({ userId });
    await this.cartRepo.save(cart);

    return (await this.findCart(userId))!;
  }

  // 🔥 PUBLIC: Sepeti Getir
  async getCart(userId: number): Promise<Cart> {
    return this.ensureCart(userId);
  }

  // 🔥 ÜRÜN EKLE
  async addItem(userId: number, dto: AddItemDto): Promise<Cart> {
    const cart = await this.ensureCart(userId);
    
    // Loglu fonksiyonu çağırıyoruz
    const variantId = await this.resolveVariantId({
        productId: dto.productId,
        variantId: dto.variantId,
        color: dto.color,
        size: dto.size
    });

    // Sepette BU varyanttan (ID'ye göre) var mı?
    let item = await this.cartItemRepo.findOne({
      where: {
        cart: { id: cart.id },
        variant: { id: variantId },
      },
    });

    if (item) {
      console.log(`🔄 Ürün zaten sepette (Mevcut: ${item.quantity}), miktar artırılıyor.`);
      item.quantity += dto.quantity;
    } else {
      console.log("✨ Yeni satır oluşturuluyor.");
      item = this.cartItemRepo.create({
        variant: { id: variantId } as ProductVariant,
        quantity: dto.quantity,
        cart,
      });
    }

    await this.cartItemRepo.save(item);
    return (await this.findCart(userId))!;
  }

  // 🔥 ÜRÜN GÜNCELLE
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

  // 🔥 ÜRÜN SİL
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

  // 🔥 SEPETİ BOŞALT
  async clear(userId: number): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) return;

    await this.cartItemRepo.delete({ cart: { id: cart.id } });
  }
}