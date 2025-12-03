import { BadRequestException } from '@nestjs/common';

import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../product/product-variant.entity';
import { Product } from '../product/entities/product.entity';

type Repository<T> = {
  findOne: (...args: any[]) => Promise<T | null>;
  create: (...args: any[]) => T;
  save: (...args: any[]) => Promise<T>;
  delete?: (...args: any[]) => Promise<void>;
};

class InMemoryCartRepository {
  data: Cart[] = [];
  private seq = 1;
  manager: {
    transaction: (cb: (manager: { getRepository: (entity: any) => any }) => Promise<void>) => Promise<void>;
  };

  constructor(private cartItemRepoSupplier: () => InMemoryCartItemRepository) {
    const managerInstance = {
      getRepository: (entity: any) => {
        if (entity === Cart) {
          return this;
        }
        if (entity === CartItem) {
          return this.cartItemRepoSupplier();
        }
        return null;
      },
    };
    this.manager = {
      transaction: async (cb) => cb(managerInstance),
    };
  }

  async findOne(options: { where: Partial<Cart> }): Promise<Cart | null> {
    const where = options.where;
    if ('id' in where && where.id) {
      return this.data.find((cart) => cart.id === where.id) ?? null;
    }
    if ('userId' in where && where.userId !== undefined) {
      return this.data.find((cart) => cart.userId === where.userId) ?? null;
    }
    if ('guestToken' in where && where.guestToken) {
      return this.data.find((cart) => cart.guestToken === where.guestToken) ?? null;
    }
    return null;
  }

  create(payload: Partial<Cart>): Cart {
    return {
      id: 0,
      userId: payload.userId ?? null,
      guestToken: payload.guestToken ?? null,
      items: payload.items ?? [],
    } as Cart;
  }

  async save(cart: Cart): Promise<Cart> {
    if (!cart.id) {
      cart.id = this.seq++;
    }
    const existingIndex = this.data.findIndex((c) => c.id === cart.id);
    if (existingIndex >= 0) {
      this.data[existingIndex] = cart;
    } else {
      this.data.push(cart);
    }
    if (!cart.items) {
      cart.items = [];
    }
    return cart;
  }

  async delete(criteria: number | Cart): Promise<void> {
    const id = typeof criteria === 'number' ? criteria : criteria.id;
    this.data = this.data.filter((cart) => cart.id !== id);
  }
}

class InMemoryCartItemRepository {
  data: CartItem[] = [];
  private seq = 1;

  create(payload: Partial<CartItem>): CartItem {
    return {
      id: 0,
      cart: payload.cart!,
      quantity: payload.quantity ?? 0,
      variant: payload.variant!,
    } as CartItem;
  }

  async save(item: CartItem): Promise<CartItem> {
    if (!item.id) {
      item.id = this.seq++;
    }
    const existingIndex = this.data.findIndex((entry) => entry.id === item.id);
    if (existingIndex >= 0) {
      this.data[existingIndex] = item;
    } else {
      this.data.push(item);
    }

    if (item.cart) {
      const cartItems = item.cart.items ?? [];
      const idx = cartItems.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        cartItems[idx] = item;
      } else {
        cartItems.push(item);
      }
      item.cart.items = cartItems;
    }

    return item;
  }

  async findOne(options: {
    where: {
      id?: number;
      cart?: { id: number };
      variant?: { id: number };
    };
  }): Promise<CartItem | null> {
    const { id, cart, variant } = options.where;
    if (id) {
      return this.data.find((item) => item.id === id) ?? null;
    }
    if (cart && variant) {
      return (
        this.data.find(
          (item) => item.cart?.id === cart.id && item.variant?.id === variant.id,
        ) ?? null
      );
    }
    if (cart) {
      return this.data.find((item) => item.cart?.id === cart.id) ?? null;
    }
    return null;
  }

  async delete(criteria: number | { cart: { id: number } } | { id: number }): Promise<void> {
    if (typeof criteria === 'number') {
      this.data = this.data.filter((item) => item.id !== criteria);
      return;
    }
    if ('id' in criteria) {
      this.data = this.data.filter((item) => item.id !== criteria.id);
      return;
    }
    if ('cart' in criteria) {
      this.data = this.data.filter((item) => item.cart?.id !== criteria.cart.id);
    }
  }
}

class InMemoryVariantRepository {
  data = new Map<number, ProductVariant>();

  setVariants(list: ProductVariant[]) {
    this.data.clear();
    list.forEach((variant) => this.data.set(variant.id, variant));
  }

  async findOne(options: { where: Partial<ProductVariant> }): Promise<ProductVariant | null> {
    const { id, product } = options.where;
    if (id !== undefined) {
      return this.data.get(id) ?? null;
    }
    if (product?.id !== undefined) {
      const found = [...this.data.values()].find((variant) => variant.product?.id === product.id);
      return found ?? null;
    }
    return null;
  }

  async save(variant: ProductVariant): Promise<ProductVariant> {
    this.data.set(variant.id, variant);
    return variant;
  }
}

class InMemoryProductRepository {
  async findOne(): Promise<Product | null> {
    return null;
  }
}

const createService = () => {
  const cartItemRepo = new InMemoryCartItemRepository();
  const cartRepo = new InMemoryCartRepository(() => cartItemRepo);
  const variantRepo = new InMemoryVariantRepository();
  const productRepo = new InMemoryProductRepository();

  const service = new CartService(
    cartRepo as unknown as Repository<Cart>,
    cartItemRepo as unknown as Repository<CartItem>,
    variantRepo as unknown as Repository<ProductVariant>,
    productRepo as unknown as Repository<Product>,
  );

  return { service, cartRepo, cartItemRepo, variantRepo };
};

const buildVariant = (id: number, name: string, color = 'Red', size = 'M'): ProductVariant =>
  ({
    id,
    color,
    size,
    price: 100,
    stock: 10,
    image: null,
    product: {
      id: id * 10,
      name,
      image: null,
      category: 'Shoes',
      subcategory: 'Sport',
      description: '',
      price: 100,
      stock: 100,
      isActive: true,
      variants: [],
      reviews: [],
      averageRating: 0,
      reviewCount: 0,
    } as Product,
  }) as ProductVariant;

describe('CartService - Add-to-cart flows', () => {
  it('adds new item to an empty cart and returns total quantity', async () => {
    const { service, variantRepo } = createService();
    variantRepo.setVariants([buildVariant(1, 'Runner')]);

    const cart = await service.addItem(25, { variantId: 1, quantity: 2 });

    expect(cart.userId).toBe(25);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
  });

  it('increments quantity when same variant is added twice', async () => {
    const { service, variantRepo } = createService();
    variantRepo.setVariants([buildVariant(1, 'Runner')]);

    await service.addItem(10, { variantId: 1, quantity: 1 });
    const cart = await service.addItem(10, { variantId: 1, quantity: 2 });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it('adds different variants as separate cart lines', async () => {
    const { service, variantRepo } = createService();
    variantRepo.setVariants([buildVariant(1, 'Runner'), buildVariant(2, 'Boot')]);

    await service.addItem(5, { variantId: 1, quantity: 1 });
    const cart = await service.addItem(5, { variantId: 2, quantity: 2 });

    expect(cart.items).toHaveLength(2);
    const total = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    expect(total).toBe(3);
  });

  it('throws when variant does not exist', async () => {
    const { service } = createService();

    await expect(service.addItem(1, { variantId: 999, quantity: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('CartService - Merge guest cart', () => {
  const prepareCartWithItem = (
    cartRepo: InMemoryCartRepository,
    cartItemRepo: InMemoryCartItemRepository,
    variant: ProductVariant,
    options: { userId?: number; guestToken?: string; quantity: number },
  ): Cart => {
    const cart = cartRepo.create({
      userId: options.userId ?? null,
      guestToken: options.guestToken ?? null,
      items: [],
    });
    cartRepo.save(cart);
    const item = cartItemRepo.create({
      cart,
      quantity: options.quantity,
      variant,
    });
    cartItemRepo.save(item);
    return cart;
  };

  it('moves guest cart into empty user cart', async () => {
    const { service, cartRepo, cartItemRepo, variantRepo } = createService();
    const variant = buildVariant(1, 'Runner');
    variantRepo.setVariants([variant]);

    const guestCart = prepareCartWithItem(cartRepo, cartItemRepo, variant, {
      guestToken: 'guest-1',
      quantity: 2,
    });
    guestCart.items[0].variant = variant;

    const merged = await service.mergeGuestCart(100, 'guest-1');
    expect(merged.userId).toBe(100);
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].quantity).toBe(2);
  });

  it('merges overlapping variants by summing quantities', async () => {
    const { service, cartRepo, cartItemRepo, variantRepo } = createService();
    const variant = buildVariant(1, 'Runner');
    variantRepo.setVariants([variant]);

    const userCart = prepareCartWithItem(cartRepo, cartItemRepo, variant, {
      userId: 200,
      quantity: 1,
    });
    userCart.items[0].variant = variant;

    const guestCart = prepareCartWithItem(cartRepo, cartItemRepo, variant, {
      guestToken: 'guest-merge',
      quantity: 2,
    });
    guestCart.items[0].variant = variant;

    const merged = await service.mergeGuestCart(200, 'guest-merge');
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].quantity).toBe(3);
  });

  it('appends non-overlapping variants', async () => {
    const { service, cartRepo, cartItemRepo, variantRepo } = createService();
    const variantA = buildVariant(1, 'Runner');
    const variantB = buildVariant(2, 'Boot');
    variantRepo.setVariants([variantA, variantB]);

    const userCart = prepareCartWithItem(cartRepo, cartItemRepo, variantA, {
      userId: 300,
      quantity: 1,
    });
    userCart.items[0].variant = variantA;

    const guestCart = prepareCartWithItem(cartRepo, cartItemRepo, variantB, {
      guestToken: 'guest-append',
      quantity: 4,
    });
    guestCart.items[0].variant = variantB;

    const merged = await service.mergeGuestCart(300, 'guest-append');
    expect(merged.items).toHaveLength(2);
    const map = new Map(merged.items.map((i) => [i.variant?.id, i.quantity]));
    expect(map.get(variantA.id)).toBe(1);
    expect(map.get(variantB.id)).toBe(4);
  });

  it('skips merge when guest cart is empty', async () => {
    const { service, cartRepo } = createService();
    const cart = cartRepo.create({ userId: 55, items: [] });
    await cartRepo.save(cart);

    const merged = await service.mergeGuestCart(55, 'missing-token');
    expect(merged.items).toHaveLength(0);
  });

  it('compresses duplicate guest variants before merging', async () => {
    const { service, cartRepo, cartItemRepo, variantRepo } = createService();
    const variant = buildVariant(1, 'Runner');
    variantRepo.setVariants([variant]);

    const guestCart = cartRepo.create({ guestToken: 'guest-dup', items: [] });
    await cartRepo.save(guestCart);
    const first = cartItemRepo.create({ cart: guestCart, quantity: 1, variant });
    const second = cartItemRepo.create({ cart: guestCart, quantity: 2, variant });
    await cartItemRepo.save(first);
    await cartItemRepo.save(second);

    const merged = await service.mergeGuestCart(400, 'guest-dup');
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].quantity).toBe(3);
  });

  it('is idempotent when merge is repeated', async () => {
    const { service, cartRepo, cartItemRepo, variantRepo } = createService();
    const variant = buildVariant(1, 'Runner');
    variantRepo.setVariants([variant]);

    const guestCart = prepareCartWithItem(cartRepo, cartItemRepo, variant, {
      guestToken: 'guest-repeat',
      quantity: 2,
    });
    guestCart.items[0].variant = variant;

    const firstMerge = await service.mergeGuestCart(500, 'guest-repeat');
    expect(firstMerge.items[0].quantity).toBe(2);

    const secondMerge = await service.mergeGuestCart(500, 'guest-repeat');
    expect(secondMerge.items[0].quantity).toBe(2);
  });
});
