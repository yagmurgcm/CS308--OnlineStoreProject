import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { InvoiceService } from './invoice.service';

const buildRequest = (userId = 1) => ({
  user: { userId },
});

const sampleCheckoutDto = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+905551112233',
  address: '42 Algorithm Ave',
  city: 'Istanbul',
  postalCode: '34000',
  country: 'Turkey',
  cardBrand: 'Visa',
  cardLast4: '4242',
};

describe('OrderController.checkout', () => {
  let controller: OrderController;
  let orderService: {
    checkout: jest.Mock;
  };

  beforeEach(async () => {
    orderService = {
      checkout: jest.fn(),
    };

    const invoiceService = {
      generateInvoicePdf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderService,
        },
        {
          provide: InvoiceService,
          useValue: invoiceService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should create order successfully', async () => {
    const orderResponse = {
      id: 101,
      totalAmount: 199.98,
      status: 'pending',
      details: [{ productId: 5, quantity: 2 }],
    };

    orderService.checkout.mockResolvedValue(orderResponse);

    const result = await controller.checkout(buildRequest(10), sampleCheckoutDto);

    expect(orderService.checkout).toHaveBeenCalledWith(10, sampleCheckoutDto);
    expect(result).toEqual(orderResponse);
  });

  it('should reject checkout when cart is empty', async () => {
    orderService.checkout.mockRejectedValue(
      new BadRequestException('Cart is empty'),
    );

    await expect(
      controller.checkout(buildRequest(11), sampleCheckoutDto),
    ).rejects.toThrow('Cart is empty');
  });

  it('should reject invalid payment information', async () => {
    orderService.checkout.mockRejectedValue(
      new BadRequestException('Invalid payment information'),
    );

    await expect(
      controller.checkout(buildRequest(12), {
        ...sampleCheckoutDto,
        cardLast4: '12',
      }),
    ).rejects.toThrow('Invalid payment information');
  });

  it('should map request DTO into order entity correctly', async () => {
    orderService.checkout.mockResolvedValue({ id: 55 });

    await controller.checkout(buildRequest(42), sampleCheckoutDto);

    expect(orderService.checkout).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        fullName: sampleCheckoutDto.fullName,
        email: sampleCheckoutDto.email,
        cardBrand: sampleCheckoutDto.cardBrand,
        cardLast4: sampleCheckoutDto.cardLast4,
        address: sampleCheckoutDto.address,
      }),
    );
  });

  it('should return order summary object', async () => {
    const summary = {
      id: 500,
      totalAmount: 349.99,
      status: 'confirmed',
      details: [
        { productId: 1, name: 'Boots', quantity: 1 },
        { productId: 2, name: 'Scarf', quantity: 2 },
      ],
      contactEmail: 'ada@example.com',
    };
    orderService.checkout.mockResolvedValue(summary);

    const result = await controller.checkout(buildRequest(7), sampleCheckoutDto);

    expect(result).toEqual(summary);
    expect(result.details).toHaveLength(2);
    expect(result.status).toBe('confirmed');
  });
});
