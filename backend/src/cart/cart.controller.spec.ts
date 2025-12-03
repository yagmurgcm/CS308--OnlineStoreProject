import { UnauthorizedException } from '@nestjs/common';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController protected endpoints', () => {
  const mockCartService = {
    addItem: jest.fn(),
    removeVariantQuantity: jest.fn(),
  } as unknown as CartService;
  const controller = new CartController(mockCartService);

  it('throws 401 when add endpoint receives no authenticated user', async () => {
    await expect(
      controller.addToAuthenticatedCart({} as any, { variantId: 1, quantity: 1 } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 when remove endpoint receives no authenticated user', async () => {
    await expect(
      controller.removeFromAuthenticatedCart({} as any, { variantId: 1, quantity: 1 } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
