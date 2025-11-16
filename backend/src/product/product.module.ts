import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

//Product Module (connects entity, service, and controller)

@Module({


  imports: [TypeOrmModule.forFeature([Product])], // connects Product entity to database
  providers: [ProductService], // service logic
  controllers: [ProductController], // API endpoints
})
export class ProductModule {}
