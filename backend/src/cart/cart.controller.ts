import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  addItem(@Req() req: any, @Body() dto: AddItemDto) {
    return this.cartService.addItem(req.user.userId, dto.productId, dto.quantity);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() req: any,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(req.user.userId, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  removeItem(@Req() req: any, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.cartService.removeItem(req.user.userId, itemId);
  }

  @Delete()
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.userId);
  }
}

