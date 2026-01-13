import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './product-variant.entity';
import { Category } from './category.entity';
import { Review } from '../reviews/review.entity';
import { OrderDetail } from '../order/order-detail.entity';
import { ProductService } from './product.service';
import { CategoryService } from './category.service';
import { ProductController } from './product.controller';
import { CategoryController } from './category.controller';

//Product Module (connects entity, service, and controller)

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, Category, Review, OrderDetail])],
  providers: [ProductService, CategoryService],
  controllers: [ProductController, CategoryController],
  exports: [CategoryService],
})
export class ProductModule {}
