import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Review } from '../reviews/review.entity'; // 👈 Review Entity'sini import etmeyi unutma
import { GetProductsQueryDto } from './dto/get-products-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAll(query: GetProductsQueryDto): Promise<any[]> {
    const { minPrice, maxPrice, size, sort, category, subcategory } = query;
    console.log("🔥 FETCHING PRODUCTS WITH SEPARATE RATING QUERY");

    // 1. ADIM: Önce Ürünleri ve Varyantları Tertemiz Çekelim (GROUP BY YOK)
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant'); // Varyantları getir

    // --- FİLTRELER ---
    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    if (subcategory) {
      qb.andWhere("product.subcategory = :subcategory", { subcategory });
    }

    if (size) {
      qb.andWhere('variant.size = :size', { size });
    }

    if (minPrice !== undefined) {
      qb.andWhere('variant.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('variant.price <= :maxPrice', { maxPrice });
    }

    // --- SIRALAMA ---
    if (sort === 'price_asc') {
      qb.orderBy('variant.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy('variant.price', 'DESC');
    } else {
      qb.orderBy('product.id', 'ASC');
    }

    // Ürünleri veritabanından çekiyoruz
    const products = await qb.getMany();

    // Eğer hiç ürün yoksa boş dönelim, boşa sorgu atmayalım
    if (products.length === 0) {
      return [];
    }

    // 2. ADIM: Sadece bu ürünlerin Puanlarını Hesapla
    // Ürün ID'lerini bir listeye alalım: [1, 2, 5, ...]
    const productIds = products.map(p => p.id);

    // Review tablosuna gidip sadece bu ID'ler için ortalama alalım
    const ratings = await this.productRepository.manager
      .createQueryBuilder(Review, 'review')
      .select('review.productId', 'productId')
      .addSelect('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.productId IN (:...ids)', { ids: productIds })
      .andWhere('review.isApproved = :approved', { approved: true }) // Sadece onaylılar
      .groupBy('review.productId')
      .getRawMany();

    // 3. ADIM: Ürünler ile Puanları Birleştir (Merge)
    return products.map((product) => {
      // Bu ürünün puan verisini bul
      const ratingData = ratings.find(r => r.productId === product.id);

      return {
        ...product,
        // Veriyi formatla (SQL'den string gelebilir)
        averageRating: ratingData ? parseFloat(ratingData.avgRating).toFixed(1) : "0",
        reviewCount: ratingData ? parseInt(ratingData.reviewCount) : 0,
      };
    });
  }

  // Get product by id, GET
  async findOne(id: number): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['variants', 'reviews'], // Detayda yorumları da çekebilirsin
    });

    if (!product) {
       throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  // Add new product, POST
  async create(product: Product): Promise<Product> {
    return this.productRepository.save(product);
  }

  // Delete product by id, DELETE
  async remove(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }
}