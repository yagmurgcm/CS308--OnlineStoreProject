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
      isApproved: false, // yorum onay beklesin
      productId: productId,
      product: { id: productId },
      userId: userId,
      user: { id: userId },
    });

    const savedReview = await this.reviewsRepository.save(newReview);

    // Puanı hemen yansıt
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
    const stats = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.productId = :id', { id: productId })
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

  async findPending() {
    return this.reviewsRepository.find({
      where: { isApproved: false },
      order: { createdAt: 'DESC' },
      relations: ['user', 'product'],
    });
  }

  async approve(id: number) {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new Error('Review not found');
    }
    review.isApproved = true;
    await this.reviewsRepository.save(review);
    await this.updateProductStats(review.productId);
    return review;
  }

  async decline(id: number) {
    const review = await this.reviewsRepository.findOne({ where: { id } });
    if (!review) {
      throw new Error('Review not found');
    }
    review.isApproved = false;
    await this.reviewsRepository.save(review);
    await this.updateProductStats(review.productId);
    return review;
  }
}
