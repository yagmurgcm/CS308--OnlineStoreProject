import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { Product } from '../product/entities/product.entity'; // 👈 EKLENDİ
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,

    // 👇 EKLENDİ: Ürün tablosunu güncellemek için buna ihtiyacımız var
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Yorum Ekleme
  async create(createReviewDto: CreateReviewDto, userId: number) {
    console.log("Service'e gelen User ID:", userId);

    const { productId, rating, comment } = createReviewDto;

    const newReview = this.reviewsRepository.create({
      rating,
      comment,
      isApproved: true, // ⚠️ DİKKAT: Test için şimdilik 'true' yap, yoksa puan hesaplanmaz
      productId: productId,
      product: { id: productId },
      userId: userId,
      user: { id: userId },
    });

    const savedReview = await this.reviewsRepository.save(newReview);

    // 🔥 EKLENDİ: Yorum kaydedilince Ürünün Puanını Güncelle
    await this.updateProductStats(productId);

    return savedReview;
  }

  // Sadece ONAYLI yorumları getir
  async findAllByProduct(productId: number) {
    return this.reviewsRepository.find({
      where: {
        productId,
        isApproved: true,
      },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  // 👇 EKLENDİ: İŞTE SİHRİ YAPAN FONKSİYON BU
  // Bu fonksiyon veritabanındaki tüm yorumları tarar, ortalamayı bulur ve Ürüne yazar.
  private async updateProductStats(productId: number) {
    const stats = await this.reviewsRepository // reviewsRepository kullanıyoruz çünkü yorumları sayacağız
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.productId = :id', { id: productId })
      .andWhere('review.isApproved = :approved', { approved: true }) // Sadece onaylılar puana etki etsin
      .getRawOne();

    const avgRating = stats.avg ? parseFloat(stats.avg).toFixed(1) : 0;
    const reviewCount = stats.count ? parseInt(stats.count) : 0;

    // Product tablosunu güncelle
    await this.productRepository.update(productId, {
      averageRating: Number(avgRating),
      reviewCount: reviewCount,
    });

    console.log(
      `✅ Ürün #${productId} güncellendi -> Puan: ${avgRating}, Sayı: ${reviewCount}`,
    );
  }
}
