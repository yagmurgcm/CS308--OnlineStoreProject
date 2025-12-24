import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WishlistService } from './wishlist.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';
import { WishlistItem } from './wishlist-item.entity';
import { Product } from '../product/entities/product.entity';

type RequestWithUser = {
  user?: { userId?: number };
};

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException('Missing user context');
    const items = await this.wishlistService.list(userId);
    return items.map((item) => this.mapWishlistItem(item));
  }

  @Post()
  async add(@Req() req: RequestWithUser, @Body() dto: AddWishlistDto) {
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException('Missing user context');
    const item = await this.wishlistService.add(userId, dto.productId);
    return this.mapWishlistItem(item);
  }

  @Delete(':productId')
  async remove(
    @Req() req: RequestWithUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new ForbiddenException('Missing user context');
    await this.wishlistService.remove(userId, productId);
    return { success: true };
  }

  private mapWishlistItem(item: WishlistItem) {
    return {
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: item.product ? this.mapProduct(item.product) : null,
    };
  }

  private mapProduct(product: Product) {
    const originalPrice = Number(product.price) || 0;
    const discounted = product.discountedPrice ?? null;
    const discountRate = Number(product.discountRate) || 0;
    const price =
      discounted !== null
        ? Number(discounted) || originalPrice
        : discountRate > 0
          ? Math.max(0, originalPrice * ((100 - discountRate) / 100))
          : originalPrice;

    return {
      id: product.id,
      name: product.name,
      price,
      originalPrice,
      discountRate,
      image: product.image ?? null,
    };
  }
}
