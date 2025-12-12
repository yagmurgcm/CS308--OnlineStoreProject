import { BadRequestException } from '@nestjs/common';

import { OrderService } from './order.service';
import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { Cart } from '../cart/entities/cart.entity';
import { ProductVariant } from '../product/product-variant.entity';

const createCheckoutService = () => {
  const orderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const detailRepository = {
    create: jest.fn(),
    insert: jest.fn(),
  };
  const cartRepository = {
    findOne: jest.fn(),
  };
  const variantRepository = {
    findOne: jest.fn(),
  };

  const manager = {
    transaction: jest.fn(async (cb) =>
      cb({
        getRepository: (entity: any) => {
          if (entity === Order) return orderRepository;
          if (entity === OrderDetail) return detailRepository;
          if (entity === Cart) return cartRepository;
          if (entity === ProductVariant) return variantRepository;
          throw new Error('Unexpected repository');
        },
      }),
    ),
  };

  const orderRepoFactory = {
    manager,
  };

  const cartService = {
    clear: jest.fn(),
  };
  const usersService = {
    findById: jest.fn(),
  };
  const invoiceService = {
    sendInvoiceEmail: jest.fn().mockResolvedValue(undefined),
  };

  const service = new OrderService(
    orderRepoFactory as any,
    detailRepository as any,
    variantRepository as any,
    cartService as any,
    usersService as any,
    invoiceService as any,
  );

  return {
    service,
    orderRepository,
    detailRepository,
    cartRepository,
    variantRepository,
    cartService,
    usersService,
    invoiceService,
  };
};

const buildCart = () => ({
  id: 10,
  userId: 1,
  items: [
    { id: 1, quantity: 2, variant: { id: 21 } },
    { id: 2, quantity: 1, variant: { id: 22 } },
  ],
});

describe('OrderService checkout (extra)', () => {
  it('creates and returns an order when cart has items', async () => {
    const {
      service,
      orderRepository,
      detailRepository,
      cartRepository,
      variantRepository,
      cartService,
      usersService,
      invoiceService,
    } = createCheckoutService();

    const orderEntity = { id: 99, details: [] } as Order;
    const cart = buildCart();
    usersService.findById.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartRepository.findOne.mockResolvedValue(cart);
    variantRepository.findOne
      .mockResolvedValueOnce({
        id: 21,
        price: 50,
        product: { id: 7 },
      } as ProductVariant)
      .mockResolvedValueOnce({
        id: 22,
        price: 30,
        product: { id: 8 },
      } as ProductVariant);
    orderRepository.create.mockReturnValue(orderEntity);
    orderRepository.save.mockResolvedValue(orderEntity);
    orderRepository.findOne.mockResolvedValue({
      ...orderEntity,
      totalPrice: 130,
      details: [],
      contactEmail: 'user@example.com',
    });
    detailRepository.create.mockImplementation((payload) => payload);

    const order = await service.checkout(1, { fullName: 'Test User', email: 'user@example.com' });

    expect(orderRepository.create).toHaveBeenCalled();
    expect(orderRepository.save).toHaveBeenCalledWith(orderEntity);
    expect(detailRepository.insert).toHaveBeenCalled();
    expect(cartService.clear).toHaveBeenCalledWith(1);
    expect(invoiceService.sendInvoiceEmail).toHaveBeenCalledWith(
      order.id,
      expect.objectContaining({ to: 'user@example.com' }),
    );
    expect(order.totalPrice).toBe(130);
  });

  it('throws when user cart is missing or empty', async () => {
    const { service, cartRepository, usersService } = createCheckoutService();
    usersService.findById.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartRepository.findOne.mockResolvedValue(null);

    await expect(service.checkout(1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists order items with computed line totals', async () => {
    const {
      service,
      detailRepository,
      cartRepository,
      variantRepository,
      usersService,
      orderRepository,
    } = createCheckoutService();

    const cart = buildCart();
    const orderEntity = { id: 77, details: [] } as Order;
    usersService.findById.mockResolvedValue({ id: 2, email: 'buyer@example.com' });
    cartRepository.findOne.mockResolvedValue(cart);
    variantRepository.findOne
      .mockResolvedValueOnce({
        id: 21,
        price: 45,
        product: { id: 7 },
      } as ProductVariant)
      .mockResolvedValueOnce({
        id: 22,
        price: 20,
        product: { id: 8 },
      } as ProductVariant);
    orderRepository.create.mockReturnValue(orderEntity);
    orderRepository.save.mockResolvedValue(orderEntity);
    orderRepository.findOne.mockResolvedValue({ ...orderEntity, totalPrice: 0 });
    detailRepository.create.mockImplementation((payload) => payload);

    await service.checkout(2, { email: 'buyer@example.com' });

    const inserted = detailRepository.insert.mock.calls[0][0];
    expect(inserted).toHaveLength(2);
    expect(inserted[0].lineTotal).toBe(90);
    expect(inserted[1].lineTotal).toBe(20);
  });
});
