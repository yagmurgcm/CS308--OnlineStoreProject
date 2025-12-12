import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

const buildCart = () => ({
  id: 1,
  userId: 1,
  guestToken: null,
  items: [
    {
      id: 10,
      quantity: 2,
      variant: {
        id: 20,
        color: 'Black',
        size: 'M',
        price: 100,
        product: {
          id: 30,
          name: 'Jacket',
          price: 100,
          image: null,
        },
      },
    },
  ],
});

describe('CartController extra API tests', () => {
  let app: INestApplication;
  const cartService = {
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateItemQuantity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: cartService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /cart/:userId/items adds an item and returns serialized cart', async () => {
    cartService.addItem.mockResolvedValue(buildCart());

    const response = await request(app.getHttpServer())
      .post('/cart/1/items')
      .send({ productId: 5, quantity: 1, color: 'Black', size: 'M' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      userId: 1,
      items: [
        expect.objectContaining({
          id: 10,
          quantity: 2,
          variantId: 20,
        }),
      ],
    });
    expect(cartService.addItem).toHaveBeenCalledWith(1, {
      productId: 5,
      quantity: 1,
      color: 'Black',
      size: 'M',
    });
  });

  it('DELETE /cart/:userId/items/:itemId removes an item and returns updated cart', async () => {
    cartService.removeItem.mockResolvedValue({ ...buildCart(), items: [] });

    const response = await request(app.getHttpServer())
      .delete('/cart/1/items/10')
      .expect(200);

    expect(response.body.items).toHaveLength(0);
    expect(cartService.removeItem).toHaveBeenCalledWith(1, 10);
  });

  it('PATCH /cart/:userId/items/:itemId updates quantity', async () => {
    const cart = buildCart();
    cart.items[0].quantity = 5;
    cartService.updateItemQuantity.mockResolvedValue(cart);

    const response = await request(app.getHttpServer())
      .patch('/cart/1/items/10')
      .send({ quantity: 5 })
      .expect(200);

    expect(response.body.items[0].quantity).toBe(5);
    expect(cartService.updateItemQuantity).toHaveBeenCalledWith(1, 10, 5);
  });
});
