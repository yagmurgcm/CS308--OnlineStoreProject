import { Test, TestingModule } from '@nestjs/testing';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';

const buildCart = () => ({
  id: 90,
  userId: 30,
  guestToken: null,
  items: [
    {
      id: 1,
      quantity: 2,
      variant: {
        id: 10,
        color: 'Black',
        size: 'M',
        price: 199.99,
        product: {
          id: 5,
          name: 'Essential Jacket',
          price: 199.99,
          image: '/jacket.png',
        },
      },
    },
  ],
});

describe('CartController API', () => {
  let controller: CartController;
  let cartService: {
    addItem: jest.Mock;
    removeItem: jest.Mock;
    updateItemQuantity: jest.Mock;
    mergeGuestCart: jest.Mock;
    clear: jest.Mock;
  };

  beforeEach(async () => {
    cartService = {
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateItemQuantity: jest.fn(),
      mergeGuestCart: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: cartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('addItem should delegate to service and serialize cart response', async () => {
    const dto: AddItemDto = { productId: 5, quantity: 1, color: 'Black', size: 'M' };
    const cart = buildCart();
    cartService.addItem.mockResolvedValue(cart);

    const response = await controller.addItem(30, dto);

    expect(cartService.addItem).toHaveBeenCalledWith(30, dto);
    expect(response).toMatchObject({
      id: cart.id,
      userId: 30,
      items: [
        expect.objectContaining({
          id: 1,
          quantity: 2,
          variantId: 10,
          productId: 5,
        }),
      ],
    });
  });

  it('removeItem should drop a cart line and return the latest cart', async () => {
    const cart = { ...buildCart(), items: [] };
    cartService.removeItem.mockResolvedValue(cart);

    const response = await controller.removeItem(30, 1);

    expect(cartService.removeItem).toHaveBeenCalledWith(30, 1);
    expect(response.items).toHaveLength(0);
  });

  it('updateQuantity should call service and return serialized data', async () => {
    const cart = buildCart();
    cart.items[0].quantity = 4;
    cartService.updateItemQuantity.mockResolvedValue(cart);

    const response = await controller.updateItemQuantity(30, 1, { quantity: 4 });

    expect(cartService.updateItemQuantity).toHaveBeenCalledWith(30, 1, 4);
    expect(response.items[0].quantity).toBe(4);
  });

  it('mergeGuestCart should merge carts and normalize payload', async () => {
    const merged = buildCart();
    merged.guestToken = 'guest-token';
    cartService.mergeGuestCart.mockResolvedValue(merged);

    const response = await controller.mergeGuestCart(44, { guestToken: 'guest-token' });

    expect(cartService.mergeGuestCart).toHaveBeenCalledWith(44, 'guest-token');
    expect(response.userId).toBe(44);
    expect(response.guestToken).toBe('guest-token');
  });

  it('clearCart should call service and emit 204 with no payload', async () => {
    cartService.clear.mockResolvedValue(undefined);

    await controller.clearCart(77);

    expect(cartService.clear).toHaveBeenCalledWith(77);
  });
});
