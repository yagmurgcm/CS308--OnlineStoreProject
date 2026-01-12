import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OrderService } from './order.service';
import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';
import { ProductVariant } from '../product/product-variant.entity';
import { Cart } from '../cart/entities/cart.entity';

class InMemoryOrderDetailRepository {
  data: OrderDetail[] = [];
  private seq = 1;

  create(payload: Partial<OrderDetail>): OrderDetail {
    return {
      id: 0,
      order: payload.order!,
      product: payload.product!,
      productId: payload.productId ?? payload.product?.id ?? 0,
      variantId: payload.variantId ?? null,
      variant: payload.variant ?? null,
      quantity: payload.quantity ?? 0,
      price: payload.price ?? 0,
      lineTotal: payload.lineTotal ?? 0,
      returnedQuantity: payload.returnedQuantity ?? 0,
    } as OrderDetail;
  }

  async save(details: OrderDetail | OrderDetail[]): Promise<OrderDetail | OrderDetail[]> {
    if (Array.isArray(details)) {
      return Promise.all(details.map((d) => this.save(d))) as OrderDetail[];
    }
    const detail = details;
    if (!detail.id) {
      detail.id = this.seq++;
    }
    const idx = this.data.findIndex((d) => d.id === detail.id);
    if (idx >= 0) {
      this.data[idx] = detail;
    } else {
      this.data.push(detail);
    }
    if (detail.order) {
      detail.order.details = detail.order.details || [];
      const existing = detail.order.details.find((d) => d.id === detail.id);
      if (!existing) {
        detail.order.details.push(detail);
      }
    }
    return detail;
  }

  async find(): Promise<OrderDetail[]> {
    return this.data;
  }
}

class InMemoryCartRepository {
  cart: Cart | null = null;

  async findOne(): Promise<Cart | null> {
    return this.cart;
  }
}

class InMemoryOrderRepository {
  data: Order[] = [];
  private seq = 1;
  constructor(
    private readonly detailRepo: InMemoryOrderDetailRepository,
    private readonly cartRepo: InMemoryCartRepository,
    private readonly variantRepo: InMemoryVariantRepository,
  ) {}

  manager = {
    transaction: async (cb: (manager: { getRepository: (entity: any) => any }) => Promise<void>) => {
      const manager = {
        getRepository: (entity: any) => {
          if (entity === Order) return this;
          if (entity === OrderDetail) return this.detailRepo;
          if (entity === Cart) return this.cartRepo;
          if (entity === ProductVariant) return this.variantRepo;
          return null;
        },
      };
      await cb(manager);
    },
  };

  create(payload: Partial<Order>): Order {
    return {
      id: 0,
      user: payload.user!,
      cart: payload.cart!,
      status: payload.status ?? 'pending',
      totalPrice: payload.totalPrice ?? 0,
      contactEmail: payload.contactEmail,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      shippingAddress: payload.shippingAddress,
      shippingCity: payload.shippingCity,
      shippingPostalCode: payload.shippingPostalCode,
      shippingCountry: payload.shippingCountry,
      paymentBrand: payload.paymentBrand,
      paymentLast4: payload.paymentLast4,
      details: payload.details ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
  }

  async save(order: Order): Promise<Order> {
    if (!order.id) {
      order.id = this.seq++;
    }
    const idx = this.data.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      this.data[idx] = order;
    } else {
      this.data.push(order);
    }
    return order;
  }

  async findOne(options: { where: { id: number }; relations?: string[] }): Promise<Order | null> {
    const order = this.data.find((o) => o.id === options.where.id);
    if (!order) return null;
    if (options.relations?.includes('details')) {
      order.details = this.detailRepo.data.filter((d) => d.order?.id === order.id);
    }
    return order;
  }

  async find(): Promise<Order[]> {
    return this.data;
  }
}

class InMemoryVariantRepository {
  data = new Map<number, ProductVariant>();

  set(variant: ProductVariant) {
    this.data.set(variant.id, variant);
  }

  async findOne(options: { where: { id: number }; relations?: string[] }): Promise<ProductVariant | null> {
    return this.data.get(options.where.id) ?? null;
  }

  async save(variant: ProductVariant): Promise<ProductVariant> {
    this.data.set(variant.id, variant);
    return variant;
  }
}

const createService = () => {
  const detailRepo = new InMemoryOrderDetailRepository();
  const cartRepo = new InMemoryCartRepository();
  const variantRepo = new InMemoryVariantRepository();
  const orderRepo = new InMemoryOrderRepository(detailRepo, cartRepo, variantRepo);
  const returnRequestRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  } as any;
  const returnRequestItemRepo = {
    find: jest.fn(),
    save: jest.fn(),
  } as any;

  const cartService = {
    getCart: jest.fn(),
    clear: jest.fn(),
  } as any;
  const usersService = {
    findById: jest.fn(),
  } as any;
  const invoiceService = {
    sendInvoiceEmail: jest.fn(),
  } as any;

  const service = new OrderService(
    orderRepo as any,
    detailRepo as any,
    returnRequestRepo,
    returnRequestItemRepo,
    variantRepo as any,
    cartService,
    usersService,
    invoiceService,
  );

  return {
    service,
    orderRepo,
    detailRepo,
    cartRepo,
    returnRequestRepo,
    returnRequestItemRepo,
    variantRepo,
    cartService,
    usersService,
    invoiceService,
  };
};

const buildVariant = (
  id: number,
  price: number,
  stock = 10,
  productName = 'Demo Product',
): ProductVariant =>
  ({
    id,
    price,
    stock,
    product: { id: id * 10, name: productName } as any,
  }) as ProductVariant;

describe('OrderService.checkout', () => {
  it('creates order and details with line totals and clears cart', async () => {
    const {
      service,
      variantRepo,
      cartService,
      usersService,
      detailRepo,
      cartRepo,
      invoiceService,
    } =
      createService();
    variantRepo.set(buildVariant(1, 50));
    variantRepo.set(buildVariant(2, 25));

    cartService.getCart.mockResolvedValue({
      id: 1,
      items: [
        { variant: { id: 1 }, quantity: 2 },
        { variant: { id: 2 }, quantity: 3 },
      ],
    });
    cartRepo.cart = {
      id: 1,
      items: [
        { variant: { id: 1 }, quantity: 2 },
        { variant: { id: 2 }, quantity: 3 },
      ],
    } as any;
    cartService.getCart.mockResolvedValue(cartRepo.cart);
    usersService.findById.mockResolvedValue({ id: 5, email: 'buyer@example.com' });

    const order = await service.checkout(5, {
      email: 'buyer@example.com',
      fullName: 'Demo Buyer',
      phone: '5555555',
      address: 'Test street',
      city: 'Istanbul',
      postalCode: '34000',
      country: 'Turkey',
      cardBrand: 'Visa',
      cardLast4: '4242',
    });

    expect(order?.totalPrice).toBe(50 * 2 + 25 * 3);
    expect(detailRepo.data).toHaveLength(2);
    expect(detailRepo.data[0].lineTotal).toBe(100);
    expect(detailRepo.data[1].lineTotal).toBe(75);
    expect(cartService.clear).toHaveBeenCalledWith(5);
    expect(invoiceService.sendInvoiceEmail).toHaveBeenCalledWith(order?.id, {
      to: 'buyer@example.com',
      contactName: 'Demo Buyer',
      contactPhone: '5555555',
      shippingAddress: 'Test street',
      shippingCity: 'Istanbul',
      shippingCountry: 'Turkey',
      shippingPostalCode: '34000',
      paymentBrand: 'Visa',
      paymentLast4: '4242',
    });
  });

  it('throws when cart is empty', async () => {
    const { service, cartRepo, cartService, usersService } = createService();
    usersService.findById.mockResolvedValue({ id: 5 });
    cartRepo.cart = { id: 1, items: [] } as any;
    cartService.getCart.mockResolvedValue(cartRepo.cart);

    await expect(service.checkout(5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when variant is missing', async () => {
    const { service, cartRepo, cartService, usersService } = createService();
    usersService.findById.mockResolvedValue({ id: 5 });
    cartRepo.cart = {
      items: [{ variant: { id: 99 }, quantity: 1 }],
    } as any;
    cartService.getCart.mockResolvedValue(cartRepo.cart);

    await expect(service.checkout(5)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('OrderService cancellations and returns', () => {
  it('cancels an order, restocks remaining items, and marks status cancelled', async () => {
    const { service, orderRepo, detailRepo, variantRepo, usersService } = createService();
    usersService.findById.mockResolvedValue({ id: 1 });

    const variant = buildVariant(1, 50, 3, 'Demo Product');
    variantRepo.set(variant);

    const order = await orderRepo.save(
      orderRepo.create({ user: { id: 1 } as any, status: 'delivered', totalPrice: 100 }),
    );

    await detailRepo.save(
      detailRepo.create({
        order,
        product: { id: 10, name: 'Demo Product' } as any,
        variant,
        variantId: variant.id,
        quantity: 2,
        price: 50,
        lineTotal: 100,
        returnedQuantity: 0,
      }),
    );

    const cancelled = await service.cancelOrder(order.id, 1);

    expect(cancelled.status).toBe('cancelled');
    expect(variantRepo.data.get(variant.id)?.stock).toBe(5); // 3 + 2 restocked
  });

  it('partially returns items and updates returnedQuantity and status', async () => {
    const { service, orderRepo, detailRepo, variantRepo, usersService } = createService();
    usersService.findById.mockResolvedValue({ id: 1 });

    const variant1 = buildVariant(1, 40, 0, 'Shirt');
    const variant2 = buildVariant(2, 60, 0, 'Jeans');
    variantRepo.set(variant1);
    variantRepo.set(variant2);

    const order = await orderRepo.save(
      orderRepo.create({ user: { id: 1 } as any, status: 'processing', totalPrice: 100 }),
    );

    const detail1 = await detailRepo.save(
      detailRepo.create({
        order,
        product: { id: 11, name: 'Shirt' } as any,
        variant: variant1,
        variantId: variant1.id,
        quantity: 2,
        price: 40,
        lineTotal: 80,
        returnedQuantity: 0,
      }),
    );

    await detailRepo.save(
      detailRepo.create({
        order,
        product: { id: 12, name: 'Jeans' } as any,
        variant: variant2,
        variantId: variant2.id,
        quantity: 1,
        price: 60,
        lineTotal: 60,
        returnedQuantity: 0,
      }),
    );

    const updated = await service.returnItems(order.id, 1, [
      { detailId: detail1.id, quantity: 1 },
    ]);

    const returnedDetail = updated.details.find((d) => d.id === detail1.id);
    expect(updated.status).toBe('partially_returned');
    expect(returnedDetail?.returnedQuantity).toBe(1);
    expect(variantRepo.data.get(variant1.id)?.stock).toBe(1);
    expect(variantRepo.data.get(variant2.id)?.stock).toBe(0);
  });
});
