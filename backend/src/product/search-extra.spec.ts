import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductService } from './product.service';
import { Product } from './entities/product.entity';

describe('ProductService searchByKeyword (extra)', () => {
  let service: ProductService;
  const productRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
    productRepository.find.mockReset();
  });

  it('returns empty list for empty query', async () => {
    const result = await service.searchByKeyword('');

    expect(result).toEqual([]);
    expect(productRepository.find).not.toHaveBeenCalled();
  });

  it('returns matching results for a keyword', async () => {
    const products = [{ id: 1, name: 'Air Runner' } as Product];
    productRepository.find.mockResolvedValue(products);

    const result = await service.searchByKeyword('Air');

    expect(productRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Array),
      }),
    );
    expect(result).toEqual(products);
  });

  it('returns empty array when nothing matches', async () => {
    productRepository.find.mockResolvedValue([]);

    const result = await service.searchByKeyword('Missing');

    expect(result).toEqual([]);
    expect(productRepository.find).toHaveBeenCalled();
  });
});
