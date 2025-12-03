import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Cart } from './entities/cart.entity';

type CartHttpResponse = {
  id: number;
  userId: number;
  items: Array<{
    id: number;
    productId: number | null;
    variantId: number | null;
    quantity: number;
    variant?: {
      id: number;
      color: string;
      size: string;
      price: number | string;
      product: {
        id: number;
        name: string;
        price: number | string;
        image: string | null;
      };
    } | null;
  }>;
};

const serializeCart = (cart: Cart): CartHttpResponse => ({
  id: cart.id,
  userId: cart.userId,
  items:
    cart.items?.map((item) => ({
      id: item.id,
      productId: item.variant?.product?.id ?? null,
      variantId: item.variant?.id ?? null,
      quantity: item.quantity,
      // 🔥 Variant detaylarını da gönder (color, size, price, product)
      variant: item.variant ? {
        id: item.variant.id,
        color: item.variant.color,
        size: item.variant.size,
        price: item.variant.price,
        product: item.variant.product ? {
          id: item.variant.product.id,
          name: item.variant.product.name,
          price: item.variant.product.price,
          image: item.variant.product.image ?? null,
        } : null as any,
      } : null,
    })) ?? [],
});

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':userId')
  async getCart(@Param('userId', ParseIntPipe) userId: number) {
    const cart = await this.cartService.getCart(userId);
    return serializeCart(cart);
  }

  @Post(':userId/items')
  async addItem(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AddItemDto,
  ) {
    const cart = await this.cartService.addItem(userId, dto);
    return serializeCart(cart);
  }

  @Patch(':userId/items')
  async updateItem(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateItemDto,
  ) {
    const cart = await this.cartService.updateItem(userId, dto);
    return serializeCart(cart);
  }

  @Delete(':userId/items/:itemId')
  async removeItem(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    const cart = await this.cartService.removeItem(userId, itemId);
    return serializeCart(cart);
  }

  @Delete(':userId/clear')
  @HttpCode(204)
  async clearCart(@Param('userId', ParseIntPipe) userId: number) {
    await this.cartService.clear(userId);
  }
}
