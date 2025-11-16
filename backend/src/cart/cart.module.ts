import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Product } from '../product/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Product])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],  // 🔥🔥 ÖNEMLİ — OrderModule bunu görsün diye
})
export class CartModule {}
