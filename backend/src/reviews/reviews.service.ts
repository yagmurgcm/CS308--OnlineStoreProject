import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
  ) {}

  // Yorum Ekleme
// Yorum Ekleme
  async create(createReviewDto: CreateReviewDto, userId: number) {
    console.log("Service'e gelen User ID:", userId); // Log ekledik

    const { productId, rating, comment } = createReviewDto;

    const newReview = this.reviewsRepository.create({
      rating,
      comment,
      isApproved: false,
      // 👇 HEM İLİŞKİYİ HEM DE SÜTUNU GARANTİYE ALIYORUZ
      productId: productId, 
      product: { id: productId }, 
      
      userId: userId,       // Direkt sütuna yaz
      user: { id: userId }, // İlişkiyi kur
    });
    
    return this.reviewsRepository.save(newReview);
  }

  // Sadece ONAYLI yorumları getir
  async findAllByProduct(productId: number) {
    return this.reviewsRepository.find({
      where: { 
        productId, 
        isApproved: true // Sadece onaylılar
      },
      order: { createdAt: 'DESC' }, // En yeni en üstte
      relations: ['user'], // Kullanıcı ismini çekmek için
    });
  }
}