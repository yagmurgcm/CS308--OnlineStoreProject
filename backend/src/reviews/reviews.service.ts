import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { Product } from '../product/entities/product.entity';
import { OrderDetail } from '../order/order-detail.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,

    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(OrderDetail)
    private orderDetailRepository: Repository<OrderDetail>,
  ) {}

  // Kullanıcının bu ürünü satın alıp TESLIM ALIP almadığını kontrol et
  // Sadece "delivered" statüsündeki siparişler için yorum/yıldız açık
  async hasPurchasedProduct(userId: number, productId: number): Promise<boolean> {
    const purchase = await this.orderDetailRepository
      .createQueryBuilder('od')
      .innerJoin('od.order', 'o')
      .where('o.userId = :userId', { userId })
      .andWhere('od.productId = :productId', { productId })
      .andWhere('o.status = :status', { status: 'delivered' })
      .getOne();

    return !!purchase;
  }

  // Yorum/Rating Ekleme
  // KURAL: Rating HEMEN eklenir, Comment ise ADMIN ONAYI bekler
  // KURAL: Comment varsa rating'e etki etmez, sadece onaylı yıldızlar ortalamaya girer
  // KURAL: Sadece ürünü satın alan kullanıcılar yorum/rating yapabilir
  async create(createReviewDto: CreateReviewDto, userId: number) {
    console.log("Service'e gelen User ID:", userId);

    const { productId, rating, comment } = createReviewDto;

    // Satın alma kontrolü
    const hasPurchased = await this.hasPurchasedProduct(userId, productId);
    if (!hasPurchased) {
      throw new ForbiddenException('You must purchase this product before leaving a review');
    }

    // Comment varsa onay bekleyecek, yoksa (sadece rating) hemen onaylı
    const hasComment = comment && comment.trim().length > 0;

    // Comment varsa rating'i 0 yap (yorum rating'e etki etmessin)
    const finalRating = hasComment ? 0 : rating;

    const newReview = this.reviewsRepository.create({
      rating: finalRating,
      comment: comment || '',
      isApproved: !hasComment, // Comment yoksa true, varsa false (admin onayı bekle)
      productId: productId,
      product: { id: productId },
      userId: userId,
      user: { id: userId },
    });

    const savedReview = await this.reviewsRepository.save(newReview);

    // Rating her zaman hemen ürüne yansısın (tüm rating'leri say, onay durumuna bakma)
    await this.updateProductStats(productId);

    return savedReview;
  }

  // Sadece ONAYLI yorumları getir (public endpoint)
  // Sadece comment'i olan review'ler gösterilir (yalnız yıldız verişler gösterilmez)
  async findAllByProduct(productId: number) {
    return this.reviewsRepository
      .createQueryBuilder('review')
      .where('review.productId = :productId', { productId })
      .andWhere('review.isApproved = :approved', { approved: true })
      .andWhere('review.comment != :emptyComment', { emptyComment: '' })
      .andWhere('review.comment IS NOT NULL')
      .leftJoinAndSelect('review.user', 'user')
      .orderBy('review.createdAt', 'DESC')
      .getMany();
  }

  // ============ ADMIN FONKSİYONLARI ============

  // Onay bekleyen tüm yorumları getir
  async findPendingReviews() {
    return this.reviewsRepository.find({
      where: { isApproved: false },
      order: { createdAt: 'DESC' },
      relations: ['user', 'product'],
    });
  }

  // Tüm yorumları getir (admin için)
  async findAllReviews() {
    return this.reviewsRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['user', 'product'],
    });
  }

  // Yorumu onayla
  async approveReview(reviewId: number) {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review #${reviewId} not found`);
    }

    review.isApproved = true;
    await this.reviewsRepository.save(review);

    // Ürün istatistiklerini güncelle
    await this.updateProductStats(review.productId);

    console.log(`✅ Review #${reviewId} ONAYLANDI`);
    return review;
  }

  // Yorumu reddet (sil)
  async rejectReview(reviewId: number) {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review #${reviewId} not found`);
    }

    const productId = review.productId;
    await this.reviewsRepository.remove(review);

    // Ürün istatistiklerini güncelle
    await this.updateProductStats(productId);

    console.log(`❌ Review #${reviewId} REDDEDİLDİ ve silindi`);
    return { message: `Review #${reviewId} rejected and deleted` };
  }

  // Ürün istatistiklerini güncelle
  // Rating'ler HER ZAMAN sayılır (onay durumuna bakılmaz)
  // Ama reviewCount sadece onaylı yorumları sayar
  private async updateProductStats(productId: number) {
    // Tüm rating'lerin ortalaması (onay durumuna bakılmaz - rating hemen yansımalı)
    const ratingStats = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.productId = :id', { id: productId })
      .getRawOne();

    // Sadece onaylı yorumların sayısı (comment count için)
    const countStats = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('COUNT(review.id)', 'count')
      .where('review.productId = :id', { id: productId })
      .andWhere('review.isApproved = :approved', { approved: true })
      .getRawOne();

    const avgRating = ratingStats.avg ? parseFloat(ratingStats.avg).toFixed(1) : 0;
    const reviewCount = countStats.count ? parseInt(countStats.count) : 0;

    await this.productRepository.update(productId, {
      averageRating: Number(avgRating),
      reviewCount: reviewCount,
    });

    console.log(
      `✅ Ürün #${productId} güncellendi -> Puan: ${avgRating}, Onaylı Yorum Sayısı: ${reviewCount}`,
    );
  }
}
