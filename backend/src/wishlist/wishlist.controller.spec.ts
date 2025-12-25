import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WishlistController } from './wishlist.controller';
import { WishlistItem } from './wishlist-item.entity';
import { WishlistService } from './wishlist.service';
import { Product } from '../product/entities/product.entity';

describe('WishlistController', () => {
  let controller: WishlistController;

  const wishlistService = {
    list: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [{ provide: WishlistService, useValue: wishlistService }],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
    Object.values(wishlistService).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  it('rejects listing requests without a user context', async () => {
    await expect(controller.list({} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(wishlistService.list).not.toHaveBeenCalled();
  });

  it('maps discounted wishlist items with a zero price correctly', async () => {
    const createdAt = new Date('2024-10-10T10:00:00Z');
    const wishlistItem: WishlistItem = {
      id: 12,
      userId: 9,
      productId: 33,
      createdAt,
      user: null as any,
      product: {
        id: 33,
        name: 'Zero Deal',
        price: 199,
        discountRate: 25,
        discountedPrice: 0,
        image: 'deal.jpg',
        category: '',
        subcategory: null,
        description: '',
        stock: 0,
        isActive: true,
        variants: [],
        reviews: [],
        averageRating: 0,
        reviewCount: 0,
      } as Product,
    };
    wishlistService.list.mockResolvedValue([wishlistItem]);

    const result = await controller.list({ user: { userId: 9 } } as any);

    expect(result).toEqual([
      {
        id: 12,
        productId: 33,
        createdAt,
        product: {
          id: 33,
          name: 'Zero Deal',
          price: 0,
          originalPrice: 199,
          discountRate: 25,
          image: 'deal.jpg',
        },
      },
    ]);
  });
});
