import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { SelectQueryBuilder } from 'typeorm';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';

type QueryBuilderMock = {
  leftJoinAndSelect: jest.Mock;
  distinct: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

const createQueryBuilder = (): QueryBuilderMock =>
  ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }) as unknown as QueryBuilderMock;

const buildRepositoryMock = (qb: QueryBuilderMock) => ({
  createQueryBuilder: jest.fn(() => qb as unknown as SelectQueryBuilder<Product>),
});

describe('ProductService search API', () => {
  const products = [
    { id: 1, name: 'Black Boots', variants: [] },
    { id: 2, name: 'Denim Jacket', variants: [] },
  ] as Product[];

  const resolveBuilder = (qb: QueryBuilderMock, items = products, total = products.length) => {
    qb.getManyAndCount.mockResolvedValue([items, total]);
  };

  const setupService = async (qb?: QueryBuilderMock) => {
    const builder = qb ?? createQueryBuilder();
    resolveBuilder(builder);
    const repository = buildRepositoryMock(builder);
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: repository,
        },
      ],
    }).compile();

    const service = module.get(ProductService);
    return { service, builder, repository };
  };

  it('should return results by title search', async () => {
    const { service, builder } = await setupService();

    const response = await service.findAll({ search: 'boots' } as any);

    expect(builder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(product.name)'),
      expect.objectContaining({ term: '%boots%' }),
    );
    expect(response.items).toHaveLength(2);
    expect(response.totalCount).toBe(2);
  });

  it('should return results filtered by category', async () => {
    const { service, builder } = await setupService();

    await service.findAll({ category: 'men' } as any);

    expect(builder.andWhere).toHaveBeenCalledWith(
      'product.category = :category',
      expect.objectContaining({ category: 'men' }),
    );
  });

  it('should respect pagination settings', async () => {
    const { service, builder } = await setupService();

    await service.findAll({ page: 3, limit: 5 } as any);

    expect(builder.skip).toHaveBeenCalledWith(10);
    expect(builder.take).toHaveBeenCalledWith(5);
  });

  it('should handle no results case gracefully', async () => {
    const qb = createQueryBuilder();
    resolveBuilder(qb, [], 0);
    const { service } = await setupService(qb);

    const response = await service.findAll({ search: 'missing' } as any);

    expect(response.items).toHaveLength(0);
    expect(response.totalCount).toBe(0);
  });

  it('should filter by price range', async () => {
    const { service, builder } = await setupService();

    await service.findAll({ minPrice: 50, maxPrice: 150 } as any);

    expect(builder.andWhere).toHaveBeenCalledWith(
      'variant.price >= :minPrice',
      expect.objectContaining({ minPrice: 50 }),
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'variant.price <= :maxPrice',
      expect.objectContaining({ maxPrice: 150 }),
    );
  });
});
