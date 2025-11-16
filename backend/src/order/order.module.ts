import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { ProductModule } from '../product/product.module';
import { Product } from '../product/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail, Product]),
    CartModule,   // ✔ CartService buradan geliyor
    UsersModule,
    ProductModule,
  ],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
