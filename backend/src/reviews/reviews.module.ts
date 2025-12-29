import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from './review.entity';
import { Product } from '../product/entities/product.entity';
import { OrderDetail } from '../order/order-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Product, OrderDetail])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
