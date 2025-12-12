import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST: Yorum/Rating Yap (Sadece giriş yapmış kullanıcılar)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    console.log('🔑 Request User:', req.user);

    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!userId) {
      throw new Error("Kullanıcı ID'si Token'dan alınamadı!");
    }

    return this.reviewsService.create(createReviewDto, +userId);
  }

  // GET: Bir ürünün onaylı yorumlarını getir (Herkes görebilir)
  @Get('product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.findAllByProduct(productId);
  }

  // ============ ADMIN ENDPOINT'LERİ ============

  // GET: Onay bekleyen yorumlar (Admin)
  @UseGuards(JwtAuthGuard)
  @Get('admin/pending')
  findPending() {
    return this.reviewsService.findPendingReviews();
  }

  // GET: Tüm yorumlar (Admin)
  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  findAll() {
    return this.reviewsService.findAllReviews();
  }

  // PATCH: Yorumu onayla (Admin)
  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.approveReview(id);
  }

  // DELETE: Yorumu reddet/sil (Admin)
  @UseGuards(JwtAuthGuard)
  @Delete('admin/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.rejectReview(id);
  }

  // Eski endpoint'i de destekle (backward compatibility)
  @Get(':productId')
  findAllLegacy(@Param('productId') productId: string) {
    return this.reviewsService.findAllByProduct(+productId);
  }
}
