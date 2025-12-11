import { ForbiddenException } from '@nestjs/common';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { InvoiceService } from './invoice.service';

describe('OrderController invoice endpoint', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;
  let invoiceService: jest.Mocked<InvoiceService>;

  beforeEach(() => {
    orderService = {
      checkout: jest.fn(),
      getOrdersByUser: jest.fn(),
      getOrderById: jest.fn(),
      assertOrderOwnership: jest.fn(),
    } as unknown as jest.Mocked<OrderService>;

    invoiceService = {
      buildInvoiceSummary: jest.fn(),
      generateInvoicePdf: jest.fn(),
      sendInvoiceEmail: jest.fn(),
    } as unknown as jest.Mocked<InvoiceService>;

    controller = new OrderController(orderService, invoiceService);
  });

  it('returns pdf buffer with correct headers', async () => {
    orderService.assertOrderOwnership.mockResolvedValue({ id: 10 } as any);
    const pdfBuffer = Buffer.from('pdf');
    invoiceService.generateInvoicePdf.mockResolvedValue(pdfBuffer);

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    await controller.getInvoice(10, { user: { userId: 1 } }, res);

    expect(orderService.assertOrderOwnership).toHaveBeenCalledWith(10, 1);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="invoice-10.pdf"',
    );
    expect(res.send).toHaveBeenCalledWith(pdfBuffer);
  });

  it('throws when user is not allowed to access order', async () => {
    orderService.assertOrderOwnership.mockRejectedValue(new ForbiddenException());

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    await expect(
      controller.getInvoice(11, { user: { userId: 2 } }, res),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(res.send).not.toHaveBeenCalled();
  });
});
