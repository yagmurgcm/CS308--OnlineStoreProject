import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':userId')
  getCart(@Param('userId', ParseIntPipe) userId: number) {
    return this.cartService.getCart(userId);
  }

  @Post(':userId/items')
  addItem(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AddItemDto,
  ) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch(':userId/items')
  updateItem(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(userId, dto);
  }

  @Delete(':userId/items/:productId')
  removeItem(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(userId, productId);
  }

  @Delete(':userId/clear')
  clear(@Param('userId', ParseIntPipe) userId: number) {
    return this.cartService.clear(userId);
  }
}
