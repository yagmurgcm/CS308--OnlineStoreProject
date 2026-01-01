import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesManagerController } from './sales-manager.controller';
import { SalesManagerService } from './sales-manager.service';
import { RolesGuard } from '../auth/roles.guard';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/order.entity';
import { OrderModule } from '../order/order.module';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { PriceDropNotifierService } from './price-drop-notifier.service';
import { Notification } from '../notifications/notification.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, WishlistItem, Notification]),
    OrderModule,
    MailModule,
  ],
  controllers: [SalesManagerController],
  providers: [SalesManagerService, RolesGuard, PriceDropNotifierService],
})
export class SalesManagerModule {}
