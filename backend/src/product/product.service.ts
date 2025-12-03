import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
// Review entity'sini import etmeye gerek kalmadı çünkü artık hesaplama yapmıyoruz!
import { GetProductsQueryDto } from './dto/get-products-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // 1. TÜM ÜRÜNLERİ LİSTELEME VE FİLTRELEME
  async findAll(query: GetProductsQueryDto): Promise<Product[]> {
    const { minPrice, maxPrice, size, sort, category, subcategory, search } = query;
    
    // QueryBuilder oluştur
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant') // Varyantları dahil et
      .distinct(true); // Aynı ürün için birden fazla varyantta tek satır döndür

    // --- FİLTRELER (HİÇBİRİ SİLİNMEDİ) ---
    
    // Kategori Filtresi
    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    // Alt Kategori Filtresi
    if (subcategory) {
      qb.andWhere("product.subcategory = :subcategory", { subcategory });
    }

    // Beden Filtresi (Varyant üzerinden)
    if (size) {
      qb.andWhere('variant.size = :size', { size });
    }

    // Fiyat Aralığı Filtreleri
    if (minPrice !== undefined) {
      qb.andWhere('variant.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('variant.price <= :maxPrice', { maxPrice });
    }

    // Arama filtresi (isim, açıklama, renk veya beden)
    if (search) {
      const term = `%${search.toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(product.name) LIKE :term
          OR LOWER(product.description) LIKE :term
          OR LOWER(variant.color) LIKE :term
          OR LOWER(variant.size) LIKE :term)`,
        { term },
      );
    }

    // --- SIRALAMA MANTIĞI ---
    if (sort === 'price_asc') {
      qb.orderBy('variant.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy('variant.price', 'DESC');
    } else if (sort === 'rating') {
      // 🔥 YENİ: Artık veritabanındaki hazır sütuna göre sıralıyoruz
      qb.orderBy('product.averageRating', 'DESC');
    } else {
      // Varsayılan sıralama (ID'ye göre)
      qb.orderBy('product.id', 'ASC');
    }

    // 🔥 ESKİ KODDAKİ "MANUEL HESAPLAMA" KISMI BURADAN KALKTI.
    // Çünkü artık product.averageRating zaten veritabanında var.
    // Direkt sonucu döndürüyoruz.
    return await qb.getMany();
  }

  // 2. TEKİL ÜRÜN GETİRME (DETAY SAYFASI İÇİN)
  async findOne(id: number): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      // Detay sayfasında yorumları göstermek istersen 'reviews' ilişkisini çekmeye devam et
      relations: ['variants', 'reviews', 'reviews.user'], 
    });

    if (!product) {
       throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  // 3. YENİ ÜRÜN EKLEME
  async create(product: Product): Promise<Product> {
    // Yeni ürün eklenirken puanı 0, yorum sayısı 0 olarak başlar (Entity'de default verdik)
    return this.productRepository.save(product);
  }

  // 4. ÜRÜN SİLME
  async remove(id: number): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product #${id} not found`);
    }
  }
}
