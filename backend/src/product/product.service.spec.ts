import { Repository } from 'typeorm';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';

type Repository<T> = {
  createQueryBuilder: () => any;
};

const firstVariantPrice = (product: Product) =>
  product.variants && product.variants[0] ? Number(product.variants[0].price) : 0;

class FakeQueryBuilder {
  private filters: Array<(product: Product) => boolean> = [];
  private comparator?: (a: Product, b: Product) => number;
  private skipValue = 0;
  private takeValue?: number;

  constructor(private readonly data: Product[]) {}

  leftJoinAndSelect() {
    return this;
  }

  distinct() {
    return this;
  }

  andWhere(condition: string, params: any) {
    if (condition.includes('product.category')) {
      this.filters.push((p) => p.category === params.category);
    } else if (condition.includes('product.subcategory')) {
      this.filters.push((p) => p.subcategory === params.subcategory);
    } else if (condition.includes('variant.size')) {
      this.filters.push((p) =>
        (p.variants ?? []).some((v) => v.size === params.size),
      );
    } else if (condition.includes('variant.price >= :minPrice')) {
      this.filters.push((p) => firstVariantPrice(p) >= params.minPrice);
    } else if (condition.includes('variant.price <= :maxPrice')) {
      this.filters.push((p) => firstVariantPrice(p) <= params.maxPrice);
    } else if (condition.includes('LOWER(product.name)') || params?.term) {
      const term = String(params.term || '').replace(/%/g, '').toLowerCase();
      this.filters.push((p) => {
        const nameMatch = (p.name ?? '').toLowerCase().includes(term);
        const descMatch = (p.description ?? '').toLowerCase().includes(term);
        const variantMatch = (p.variants ?? []).some(
          (v) =>
            (v.color ?? '').toLowerCase().includes(term) ||
            (v.size ?? '').toLowerCase().includes(term),
        );
        return nameMatch || descMatch || variantMatch;
      });
    }
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC') {
    const getter = (p: Product) => {
      if (field === 'variant.price') return firstVariantPrice(p);
      if (field === 'product.averageRating') return p.averageRating ?? 0;
      if (field === 'product.reviewCount') return p.reviewCount ?? 0;
      return p.id ?? 0;
    };
    this.comparator = (a, b) => {
      const diff = getter(a) - getter(b);
      return direction === 'ASC' ? diff : -diff;
    };
    return this;
  }

  skip(value: number) {
    this.skipValue = value;
    return this;
  }

  take(value: number) {
    this.takeValue = value;
    return this;
  }

  async getManyAndCount(): Promise<[Product[], number]> {
    let results = this.data.filter((product) =>
      this.filters.every((filter) => filter(product)),
    );
    if (this.comparator) {
      results = [...results].sort(this.comparator);
    }
    const totalCount = results.length;
    const start = Math.max(0, this.skipValue);
    const end = this.takeValue ? start + this.takeValue : undefined;
    const items = results.slice(start, end);
    return [items, totalCount];
  }
}

const buildProduct = (
  id: number,
  overrides: Partial<Product> = {},
): Product => ({
  id,
  name: overrides.name ?? `Product ${id}`,
  image: null,
  category: overrides.category ?? 'Category',
  subcategory: overrides.subcategory ?? 'Sub',
  description: overrides.description ?? '',
  price: overrides.price ?? id,
  stock: overrides.stock ?? 10,
  isActive: overrides.isActive ?? true,
  averageRating: overrides.averageRating ?? 0,
  reviewCount: overrides.reviewCount ?? 0,
  variants:
    overrides.variants ??
    [
      {
        id: id * 10,
        color: 'Red',
        size: 'M',
        price: overrides.price ?? id,
        stock: 5,
        image: null,
        product: undefined as any,
        createdAt: new Date(),
      },
    ],
  reviews: [],
});

const createService = (products: Product[]) => {
  const qbFactory = () => new FakeQueryBuilder(products);
  const repo = {
    createQueryBuilder: jest.fn().mockImplementation(qbFactory),
  } as unknown as Repository<Product>;
  return { service: new ProductService(repo), repo };
};

describe('ProductService - pagination and sorting', () => {
  it('returns the correct subset and metadata for the requested page', async () => {
    const products = Array.from({ length: 15 }, (_, idx) =>
      buildProduct(idx + 1),
    );
    const { service } = createService(products);

    const result = await service.findAll({ page: 2, limit: 5 });

    expect(result.items.map((p) => p.id)).toEqual([6, 7, 8, 9, 10]);
    expect(result.totalCount).toBe(15);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
  });

  it('sorts by popularity (reviewCount) before applying pagination', async () => {
    const products = [
      buildProduct(1, { reviewCount: 5 }),
      buildProduct(2, { reviewCount: 20 }),
      buildProduct(3, { reviewCount: 10 }),
    ];
    const { service } = createService(products);

    const result = await service.findAll({ sort: 'popularity', limit: 2 });

    expect(result.items.map((p) => p.id)).toEqual([2, 3]);
    expect(result.totalCount).toBe(3);
  });

  it('returns empty items when page is out of range but preserves totalCount', async () => {
    const products = Array.from({ length: 12 }, (_, idx) =>
      buildProduct(idx + 1),
    );
    const { service } = createService(products);

    const result = await service.findAll({ page: 5, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(12);
    expect(result.page).toBe(5);
    expect(result.pageSize).toBe(10);
  });

  it('combines filtering with pagination metadata', async () => {
    const products = [
      buildProduct(1, { category: 'Shoes' }),
      buildProduct(2, { category: 'Hats' }),
      buildProduct(3, { category: 'Shoes' }),
    ];
    const { service } = createService(products);

    const result = await service.findAll({ category: 'Shoes', page: 1, limit: 1 });

    expect(result.totalCount).toBe(2);
    expect(result.items[0].category).toBe('Shoes');
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
  });
});
