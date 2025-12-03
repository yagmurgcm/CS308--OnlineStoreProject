import { NotFoundException } from '@nestjs/common';

import { InvoiceService } from './invoice.service';
import { Order } from './order.entity';
import { OrderDetail } from './order-detail.entity';

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('InvoiceService', () => {
  const orderRepo = createMockRepo();
  const detailRepo = createMockRepo();
  let service: InvoiceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoiceService(orderRepo as any, detailRepo as any);
  });

  it('throws when order is missing', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(service.buildInvoiceSummary(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  const seedOrder = (overrides: Partial<Order> = {}) => {
    const order = {
      id: 10,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      user: { id: 5, email: 'demo@example.com' },
      ...overrides,
    } as Order;
    orderRepo.findOne.mockResolvedValue(order);
    return order;
  };

  it('computes single item totals with tax, shipment and discount', async () => {
    seedOrder();
    detailRepo.find.mockResolvedValue([
      {
        id: 1,
        product: { name: 'Sneaker', subcategory: 'Blue / 40' } as any,
        quantity: 2,
        price: 50,
      } as OrderDetail,
    ]);

    const result = await service.buildInvoiceSummary(10, {
      taxRate: 0.2,
      shipment: 10,
      discount: 5,
    });

    expect(result.totals).toEqual({
      subtotal: 100,
      tax: 20,
      discount: 5,
      shipment: 10,
      grandTotal: 125,
    });
  });

  it('sums multiple items correctly and returns DTO fields', async () => {
    seedOrder();
    detailRepo.find.mockResolvedValue([
      {
        id: 1,
        product: { name: 'Sneaker X', subcategory: 'Red / 42' } as any,
        quantity: 2,
        price: '100.50',
      } as OrderDetail,
      {
        id: 2,
        product: { name: 'Cap', subcategory: null } as any,
        quantity: 1,
        price: 25,
      } as OrderDetail,
    ]);

    const result = await service.buildInvoiceSummary(10, {
      taxRate: 0.1,
      shipment: 15,
      discount: 5,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      productName: 'Sneaker X',
      variant: 'Red / 42',
      unitPrice: 100.5,
    });
    expect(result.customer).toEqual({ userId: 5, email: 'demo@example.com' });
    expect(result.totals).toEqual({
      subtotal: 226,
      tax: 22.6,
      discount: 5,
      shipment: 15,
      grandTotal: 258.6,
    });
  });

  it('reflects discount-only orders', async () => {
    seedOrder();
    detailRepo.find.mockResolvedValue([
      {
        id: 1,
        product: { name: 'Gift Card', subcategory: null } as any,
        quantity: 1,
        price: 40,
      } as OrderDetail,
    ]);

    const result = await service.buildInvoiceSummary(10, {
      taxRate: 0,
      shipment: 0,
      discount: 10,
    });

    expect(result.totals.grandTotal).toBe(30);
  });

  it('handles orders with no items gracefully', async () => {
    seedOrder();
    detailRepo.find.mockResolvedValue([]);

    const result = await service.buildInvoiceSummary(10);

    expect(result.items).toEqual([]);
    expect(result.totals).toEqual({
      subtotal: 0,
      tax: 0,
      discount: 0,
      shipment: 0,
      grandTotal: 0,
    });
  });

  it('rounds tax values to two decimals', async () => {
    seedOrder();
    detailRepo.find.mockResolvedValue([
      {
        id: 1,
        product: { name: 'Accessory', subcategory: null } as any,
        quantity: 1,
        price: 33.33,
      } as OrderDetail,
    ]);

    const result = await service.buildInvoiceSummary(10, { taxRate: 0.075 });
    expect(result.totals.tax).toBe(2.5);
    expect(result.totals.grandTotal).toBeCloseTo(35.83, 2);
  });
});
