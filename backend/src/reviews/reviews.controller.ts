import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
// DİKKAT: AuthGuard yolun farklı olabilir. Eğer hata verirse '../auth/auth.guard' yolunu kontrol et.
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST: Yorum Yap (Sadece giriş yapmış kullanıcılar)
 @UseGuards(JwtAuthGuard) 
  @Post()
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    // Debug için konsola token içeriğini basalım
    console.log("🔑 Request User:", req.user);

    // ID'yi bulmak için her ihtimali deniyoruz
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub; 

    if (!userId) {
      throw new Error("Kullanıcı ID'si Token'dan alınamadı!");
    }

    return this.reviewsService.create(createReviewDto, +userId); // +userId ile sayıya çevirmeyi garantiye al
  }
  // GET: Bir ürünün yorumlarını getir (Herkes görebilir)
  @Get(':productId')
  findAll(@Param('productId') productId: string) {
    return this.reviewsService.findAllByProduct(+productId);
  }
}