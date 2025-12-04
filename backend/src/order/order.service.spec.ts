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
      quantity: payload.quantity ?? 0,
      price: payload.price ?? 0,
      lineTotal: payload.lineTotal ?? 0,
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
  ) {}

  manager = {
    transaction: async (cb: (manager: { getRepository: (entity: any) => any }) => Promise<void>) => {
      const manager = {
        getRepository: (entity: any) => {
          if (entity === Order) return this;
          if (entity === OrderDetail) return this.detailRepo;
          if (entity === Cart) return this.cartRepo;
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
}

const createService = () => {
  const detailRepo = new InMemoryOrderDetailRepository();
  const cartRepo = new InMemoryCartRepository();
  const orderRepo = new InMemoryOrderRepository(detailRepo, cartRepo);
  const variantRepo = new InMemoryVariantRepository();

  const cartService = {
    getCart: jest.fn(),
    clear: jest.fn(),
  } as any;
  const usersService = {
    findById: jest.fn(),
  } as any;

  const service = new OrderService(
    orderRepo as any,
    detailRepo as any,
    variantRepo as any,
    cartService,
    usersService,
  );

  return {
    service,
    orderRepo,
    detailRepo,
    cartRepo,
    variantRepo,
    cartService,
    usersService,
  };
};

const buildVariant = (id: number, price: number, productName = 'Demo Product'): ProductVariant =>
  ({
    id,
    price,
    product: { id: id * 10, name: productName } as any,
  }) as ProductVariant;

describe('OrderService.checkout', () => {
  it('creates order and details with line totals and clears cart', async () => {
    const { service, variantRepo, cartService, usersService, detailRepo, cartRepo } =
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

    const order = await service.checkout(5);

    expect(order?.totalPrice).toBe(50 * 2 + 25 * 3);
    expect(detailRepo.data).toHaveLength(2);
    expect(detailRepo.data[0].lineTotal).toBe(100);
    expect(detailRepo.data[1].lineTotal).toBe(75);
    expect(cartService.clear).toHaveBeenCalledWith(5);
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
