import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { ReturnRequest } from './return-request.entity';
import { ReturnRequestItem } from './return-request-item.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { InvoiceService } from './invoice.service';

import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';
import { ProductModule } from '../product/product.module';

import { ProductVariant } from '../product/product-variant.entity';
import { RolesGuard } from '../auth/roles.guard';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderDetail,
      ReturnRequest,
      ReturnRequestItem,
      ProductVariant,
    ]),
    CartModule, // ✔ CartService buradan geliyor
    UsersModule,
    ProductModule,
    MailModule,
  ],
  providers: [OrderService, InvoiceService, RolesGuard],
  controllers: [OrderController],
  exports: [InvoiceService],
})
export class OrderModule {}
