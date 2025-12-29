import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductFilterService, ProductFilterOptions } from './product-filter.service';
import { Product } from './entities/product.entity';

describe('ProductFilterService', () => {
  let service: ProductFilterService;
  const productRepository = {
    find: jest.fn(),
  };

  const sampleProducts: Product[] = [
    {
      id: 1,
      name: 'Runner Sneaker',
      category: 'shoes',
      subcategory: 'sneakers',
      description: '',
      image: '',
      price: 120,
      stock: 5,
      isActive: true,
      variants: [],
      reviews: [],
      averageRating: 4.5,
      reviewCount: 12,
    } as Product,
    {
      id: 2,
      name: 'Wool Coat',
      category: 'outerwear',
      subcategory: 'coats',
      description: '',
      image: '',
      price: 260,
      stock: 2,
      isActive: false,
      variants: [],
      reviews: [],
      averageRating: 4.9,
      reviewCount: 32,
    } as Product,
    {
      id: 3,
      name: 'Leather Boots',
      category: 'shoes',
      subcategory: 'boots',
      description: '',
      image: '',
      price: 320,
      stock: 8,
      isActive: true,
      variants: [],
      reviews: [],
      averageRating: 4.7,
      reviewCount: 22,
    } as Product,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductFilterService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get(ProductFilterService);
    jest.clearAllMocks();
  });

  const mockFind = (data: Product[]) => {
    productRepository.find.mockResolvedValue(data);
  };

  it('filters by category', async () => {
    mockFind(sampleProducts);

    const result = await service.filterProducts({ category: 'shoes' });

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.category === 'shoes')).toBe(true);
  });

  it('filters by price range', async () => {
    mockFind(sampleProducts);

    const result = await service.filterProducts({
      minPrice: 200,
      maxPrice: 300,
    });

    expect(result).toEqual([sampleProducts[1]]);
  });

  it('filters by multiple attributes', async () => {
    mockFind(sampleProducts);
    const options: ProductFilterOptions = {
      attributes: { subcategory: 'boots', isActive: true },
    };

    const result = await service.filterProducts(options);

    expect(result).toEqual([sampleProducts[2]]);
  });

  it('returns empty array when nothing matches', async () => {
    mockFind(sampleProducts);

    const result = await service.filterProducts({ category: 'accessories' });

    expect(result).toEqual([]);
  });
});
