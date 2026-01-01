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
import { User } from '../users/user.entity';

describe('Sales Manager Discount Tests', () => {
  let app: INestApplication;
  let productStore: Product[];
  let wishlistStore: WishlistItem[];
  let notifications: Notification[];

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
    wishlistRepo.find.mockImplementation(async ({ where }) => {
      const ids = extractIds(where?.productId);
      return wishlistStore.filter((item) => ids.includes(item.productId));
    });
    notificationRepo.save.mockImplementation(async (records) => {
      const payload = Array.isArray(records) ? records : [records];
      notifications.push(...(payload as Notification[]));
      return payload;
    });
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

  it('creates a notification for wishlist users after a product is discounted', async () => {
    const wishlistUser = { id: 50, email: 'wish@example.com', name: 'Wish User', role: 'customer' } as User;
    productStore = [
      { id: 10, name: 'Product A', price: 120, discountRate: 0, discountedPrice: null } as Product,
    ];
    wishlistStore = [
      {
        id: 1,
        user: wishlistUser,
        userId: wishlistUser.id,
        productId: 10,
        product: productStore[0],
        createdAt: new Date(),
      } as WishlistItem,
    ];
    notifications = [];
    await setupApp('SALES_MANAGER');

    await request(app.getHttpServer())
      .post('/sales-manager/discounts')
      .send({ productIds: [10], discountRate: 15 })
      .expect(201);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId: wishlistUser.id,
      title: expect.stringContaining('Wishlist'),
      message: expect.stringContaining('Product A'),
    });
  });
});
