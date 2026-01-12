import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './product-variant.entity';
import { Category } from './category.entity';
import { ProductService } from './product.service';
import { CategoryService } from './category.service';
import { ProductController } from './product.controller';
import { CategoryController } from './category.controller';

//Product Module (connects entity, service, and controller)

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, Category])],
  providers: [ProductService, CategoryService],
  controllers: [ProductController, CategoryController],
  exports: [CategoryService],
})
export class ProductModule {}
