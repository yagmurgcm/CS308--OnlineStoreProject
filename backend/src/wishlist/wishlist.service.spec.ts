import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistItem } from './wishlist-item.entity';
import { Product } from '../product/entities/product.entity';

describe('WishlistService', () => {
  let service: WishlistService;

  const wishlistRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
    delete: jest.fn(),
  };

  const productRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: getRepositoryToken(WishlistItem), useValue: wishlistRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    jest.clearAllMocks();
    Object.values(wishlistRepo).forEach((fn) => (fn as jest.Mock).mockReset());
    Object.values(productRepo).forEach((fn) => (fn as jest.Mock).mockReset());
  });

  describe('add', () => {
    it('returns existing entry when the product is already in wishlist', async () => {
      const existing = { id: 1, userId: 7, productId: 42 } as WishlistItem;
      wishlistRepo.findOne.mockResolvedValue(existing);

      const result = await service.add(7, 42);

      expect(result).toBe(existing);
      expect(wishlistRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 7, productId: 42 },
        relations: ['product'],
      });
      expect(wishlistRepo.save).not.toHaveBeenCalled();
    });

    it('saves a new wishlist record when product exists', async () => {
      wishlistRepo.findOne.mockResolvedValue(null);
      const product = { id: 3, name: 'Boots' } as Product;
      productRepo.findOne.mockResolvedValue(product);
      const created = { id: 11 } as WishlistItem;
      wishlistRepo.create.mockReturnValue(created);
      wishlistRepo.save.mockResolvedValue({ id: 11 });
      const hydrated = { ...created, product } as WishlistItem;
      wishlistRepo.findOneOrFail.mockResolvedValue(hydrated);

      const result = await service.add(5, 3);

      expect(productRepo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(wishlistRepo.create).toHaveBeenCalledWith({
        userId: 5,
        productId: 3,
        product,
      });
      expect(wishlistRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(hydrated);
    });

    it('throws when trying to add a missing product', async () => {
      wishlistRepo.findOne.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.add(8, 99)).rejects.toBeInstanceOf(NotFoundException);
      expect(wishlistRepo.save).not.toHaveBeenCalled();
    });
  });

  it('lists wishlist items for the given user', async () => {
    const records = [{ id: 4 } as WishlistItem];
    wishlistRepo.find.mockResolvedValue(records);

    const result = await service.list(10);

    expect(result).toEqual(records);
    expect(wishlistRepo.find).toHaveBeenCalledWith({
      where: { userId: 10 },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  });

  it('removes an item using user and product id', async () => {
    await service.remove(2, 15);

    expect(wishlistRepo.delete).toHaveBeenCalledWith({
      userId: 2,
      productId: 15,
    });
  });
});
