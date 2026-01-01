import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SalesManagerService } from './sales-manager.service';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/order.entity';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { Notification } from '../notifications/notification.entity';
import { InvoiceService } from '../order/invoice.service';
import { MailService } from '../mail/mail.service';

describe('SalesManagerService.applyDiscount', () => {
  let service: SalesManagerService;

  const productRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };
  const orderRepo = {};
  const wishlistRepo = {
    find: jest.fn(),
  };
  const notificationRepo = {
    save: jest.fn(),
  };
  const invoiceService = {
    generateInvoicePdf: jest.fn(),
  };
  const mailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    productRepo.find.mockResolvedValue([]);
    productRepo.save.mockImplementation(async (entities) => entities);
    wishlistRepo.find.mockResolvedValue([]);
    notificationRepo.save.mockResolvedValue([]);
    mailService.sendMail.mockResolvedValue({ messageId: 'ok' });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SalesManagerService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(WishlistItem), useValue: wishlistRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: InvoiceService, useValue: invoiceService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = moduleRef.get(SalesManagerService);
  });

  it('applies discount to a product successfully', async () => {
    // Arrange
    const product = {
      id: 1,
      name: 'Leather Bag',
      price: 99.95,
      discountRate: 0,
      discountedPrice: null,
    } as Product;
    productRepo.find.mockResolvedValue([product]);

    // Act
    const result = await service.applyDiscount({ productIds: [1], discountRate: 15 });

    // Assert
    expect(result).toEqual({ updatedCount: 1, discountRate: 15 });
    expect(product.discountRate).toBe(15);
    expect(product.discountedPrice).toBe(84.96);
    expect(productRepo.save).toHaveBeenCalledWith([product]);
  });

  it('throws NotFound when product does not exist', async () => {
    // Arrange
    productRepo.find.mockResolvedValue([]);

    // Act + Assert
    await expect(
      service.applyDiscount({ productIds: [999], discountRate: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('rejects invalid discount rate', async () => {
    // Arrange
    const product = {
      id: 2,
      name: 'Boots',
      price: 200,
      discountRate: 0,
      discountedPrice: null,
    } as Product;
    productRepo.find.mockResolvedValue([product]);

    // Act + Assert
    await expect(
      service.applyDiscount({ productIds: [2], discountRate: 120 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(productRepo.find).not.toHaveBeenCalled();
    expect(productRepo.save).not.toHaveBeenCalled();
  });

  it('removes/clears discount correctly', async () => {
    // Arrange
    const product = {
      id: 3,
      name: 'Coat',
      price: 150,
      discountRate: 20,
      discountedPrice: 120,
    } as Product;
    productRepo.find.mockResolvedValue([product]);

    // Act
    const result = await service.applyDiscount({ productIds: [3], discountRate: 0 });

    // Assert
    expect(result).toEqual({ updatedCount: 1, discountRate: 0 });
    expect(product.discountRate).toBe(0);
    expect(product.discountedPrice).toBeNull();
    expect(productRepo.save).toHaveBeenCalledWith([product]);
  });
});
