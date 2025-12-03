import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { Cart } from './entities/cart.entity';
import { VariantQuantityDto } from './dto/variant-quantity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthenticatedRequest = {
  user: {
    id: number;
  };
};

const resolveUserId = (req: AuthenticatedRequest): number => {
  if (!req?.user?.id) {
    throw new UnauthorizedException();
  }
  return req.user.id;
};

type CartHttpResponse = {
  id: number;
  userId: number | null;
  guestToken: string | null;
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
      } | null;
    } | null;
  }>;
};

const serializeCart = (cart: Cart): CartHttpResponse => ({
  id: cart.id,
  userId: cart.userId ?? null,
  guestToken: cart.guestToken ?? null,
  items:
    cart.items?.map((item) => ({
      id: item.id,
      productId: item.variant?.product?.id ?? null,
      variantId: item.variant?.id ?? null,
      quantity: item.quantity,
      // 🔥 Variant detaylarını da gönder (color, size, price, product)
      variant: item.variant
        ? {
            id: item.variant.id,
            color: item.variant.color,
            size: item.variant.size,
            price: item.variant.price,
            product: item.variant.product
              ? {
                  id: item.variant.product.id,
                  name: item.variant.product.name,
                  price: item.variant.product.price,
                  image: item.variant.product.image ?? null,
                }
              : null,
          }
        : null,
    })) ?? [],
});

const buildCartSummary = (cart: Cart) => ({
  cartId: cart.id,
  items:
    cart.items?.map((item) => ({
      id: item.id,
      variantId: item.variant?.id ?? null,
      productId: item.variant?.product?.id ?? null,
      quantity: item.quantity,
      productName: item.variant?.product?.name ?? null,
    })) ?? [],
  totalItems: cart.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
});

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':userId')
  async getCart(@Param('userId', ParseIntPipe) userId: number) {
    const cart = await this.cartService.getCart(userId);
    return serializeCart(cart);
  }

  @Post(':userId/merge-guest')
  async mergeGuestCart(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: MergeCartDto,
  ) {
    const cart = await this.cartService.mergeGuestCart(userId, dto.guestToken);
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

  @Post('guest')
  async createGuestCart() {
    const cart = await this.cartService.createGuestCart();
    return serializeCart(cart);
  }

  @Get('guest/:guestToken')
  async getGuestCart(
    @Param('guestToken', new ParseUUIDPipe({ version: '4' }))
    guestToken: string,
  ) {
    const cart = await this.cartService.getGuestCart(guestToken);
    return serializeCart(cart);
  }

  @Post('guest/:guestToken/items')
  async addGuestItem(
    @Param('guestToken', new ParseUUIDPipe({ version: '4' }))
    guestToken: string,
    @Body() dto: AddItemDto,
  ) {
    const cart = await this.cartService.addItemForGuest(guestToken, dto);
    return serializeCart(cart);
  }

  @Patch('guest/:guestToken/items')
  async updateGuestItem(
    @Param('guestToken', new ParseUUIDPipe({ version: '4' }))
    guestToken: string,
    @Body() dto: UpdateItemDto,
  ) {
    const cart = await this.cartService.updateGuestItem(guestToken, dto);
    return serializeCart(cart);
  }

  @Delete('guest/:guestToken/items/:itemId')
  async removeGuestItem(
    @Param('guestToken', new ParseUUIDPipe({ version: '4' }))
    guestToken: string,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    const cart = await this.cartService.removeGuestItem(guestToken, itemId);
    return serializeCart(cart);
  }

  @Delete('guest/:guestToken/clear')
  @HttpCode(204)
  async clearGuestCart(
    @Param('guestToken', new ParseUUIDPipe({ version: '4' }))
    guestToken: string,
  ) {
    await this.cartService.clearGuestCart(guestToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addToAuthenticatedCart(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VariantQuantityDto,
  ) {
    const userId = resolveUserId(req);
    const cart = await this.cartService.addItem(userId, {
      variantId: dto.variantId,
      quantity: dto.quantity,
    });
    return buildCartSummary(cart);
  }

  @UseGuards(JwtAuthGuard)
  @Post('remove')
  async removeFromAuthenticatedCart(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VariantQuantityDto,
  ) {
    const userId = resolveUserId(req);
    const cart = await this.cartService.removeVariantQuantity(
      userId,
      dto.variantId,
      dto.quantity,
    );
    return buildCartSummary(cart);
  }
}
