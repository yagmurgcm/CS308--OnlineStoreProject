import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { InvoiceService } from './invoice.service';

import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { ProductModule } from '../product/product.module';

import { ProductVariant } from '../product/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail, ProductVariant]),
    CartModule, // ✔ CartService buradan geliyor
    UsersModule,
    ProductModule,
  ],
  providers: [OrderService, InvoiceService],
  controllers: [OrderController],
  exports: [InvoiceService],
})
export class OrderModule {}
