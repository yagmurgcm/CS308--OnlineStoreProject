import { UnauthorizedException } from '@nestjs/common';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController protected endpoints', () => {
  const mockCartService = {
    addItem: jest.fn(),
    removeVariantQuantity: jest.fn(),
  } as unknown as CartService;
  const controller = new CartController(mockCartService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

describe('CartController cart maintenance', () => {
  let mockCartService: any;
  let controller: CartController;

  beforeEach(() => {
    mockCartService = {
      addItem: jest.fn(),
      removeVariantQuantity: jest.fn(),
      updateItemQuantity: jest.fn(),
      updateGuestItemQuantity: jest.fn(),
      clear: jest.fn(),
      clearGuestCart: jest.fn(),
    } as unknown as CartService;
    controller = new CartController(mockCartService);
  });

  it('updates user cart item quantity through dedicated endpoint', async () => {
    const cart = { id: 1, userId: 7, guestToken: null, items: [] };
    mockCartService.updateItemQuantity.mockResolvedValue(cart);

    const response = await controller.updateItemQuantity(7, 15, { quantity: 3 } as any);

    expect(mockCartService.updateItemQuantity).toHaveBeenCalledWith(7, 15, 3);
    expect(response).toEqual({ id: 1, userId: 7, guestToken: null, items: [] });
  });

  it('updates guest cart item quantity through dedicated endpoint', async () => {
    const cart = { id: 2, userId: null, guestToken: 'guest-1', items: [] };
    mockCartService.updateGuestItemQuantity.mockResolvedValue(cart);

    const response = await controller.updateGuestItemQuantity('guest-1', 5, { quantity: 2 } as any);

    expect(mockCartService.updateGuestItemQuantity).toHaveBeenCalledWith('guest-1', 5, 2);
    expect(response).toEqual({ id: 2, userId: null, guestToken: 'guest-1', items: [] });
  });

  it('clears user and guest carts', async () => {
    await expect(controller.clearCart(3)).resolves.toBeUndefined();
    await expect(controller.clearGuestCart('guest-token')).resolves.toBeUndefined();

    expect(mockCartService.clear).toHaveBeenCalledWith(3);
    expect(mockCartService.clearGuestCart).toHaveBeenCalledWith('guest-token');
  });
});
