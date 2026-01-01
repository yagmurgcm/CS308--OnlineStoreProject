import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { SalesManagerController } from './sales-manager.controller';
import { SalesManagerService } from './sales-manager.service';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/order.entity';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { Notification } from '../notifications/notification.entity';
import { InvoiceService } from '../order/invoice.service';
import { MailService } from '../mail/mail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('Sales Manager Discount Tests', () => {
  let app: INestApplication;
  let productStore: Product[];

  const extractIds = (value: any): number[] => {
    if (Array.isArray(value)) return value as number[];
    if (Array.isArray(value?.value)) return value.value;
    if (Array.isArray(value?._value)) return value._value;
    const valueOf = value?.valueOf?.();
    return Array.isArray(valueOf) ? valueOf : [];
  };

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

  const setupApp = async (role = 'SALES_MANAGER') => {
    productRepo.find.mockImplementation(async ({ where }) => {
      const ids = extractIds(where?.id);
      return productStore.filter((product) => ids.includes(product.id));
    });
    productRepo.save.mockImplementation(async (entities) => {
      const records = Array.isArray(entities) ? entities : [entities];
      records.forEach((record) => {
        const index = productStore.findIndex((p) => p.id === record.id);
        if (index >= 0) {
          productStore[index] = { ...productStore[index], ...record };
        } else {
          productStore.push(record as Product);
        }
      });
      return records;
    });
    wishlistRepo.find.mockResolvedValue([]);
    notificationRepo.save.mockResolvedValue([]);
    mailService.sendMail.mockResolvedValue({ messageId: 'ok' });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SalesManagerController],
      providers: [
        SalesManagerService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(WishlistItem), useValue: wishlistRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: InvoiceService, useValue: invoiceService },
        { provide: MailService, useValue: mailService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = { userId: 1, role };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: any) => {
          const userRole = context.switchToHttp().getRequest().user?.role?.toUpperCase();
          if (userRole === 'SALES_MANAGER' || userRole === 'ADMIN') {
            return true;
          }
          throw new ForbiddenException('Insufficient permissions');
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  };

  afterEach(async () => {
    await app?.close();
    jest.clearAllMocks();
  });

  it('calculates and persists discounted price when a sales manager applies a discount', async () => {
    productStore = [
      {
        id: 1,
        name: 'Test Product',
        price: 100,
        discountRate: 0,
        discountedPrice: null,
      } as Product,
    ];
    await setupApp('SALES_MANAGER');

    const response = await request(app.getHttpServer())
      .post('/sales-manager/discounts')
      .send({ productIds: [1], discountRate: 20 })
      .expect(201);

    expect(response.body).toMatchObject({ updatedCount: 1, discountRate: 20 });
    expect(productStore[0].discountRate).toBe(20);
    expect(productStore[0].discountedPrice).toBe(80);
    expect(productRepo.save).toHaveBeenCalled();
  });
});
