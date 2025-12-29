import { BadRequestException } from '@nestjs/common';

import { PaymentService, type PaymentGateway } from './payment.service';

describe('PaymentService external provider integration', () => {
  let service: PaymentService;
  let gateway: jest.Mocked<PaymentGateway>;

  beforeEach(() => {
    service = new PaymentService();
    gateway = {
      charge: jest.fn(),
      refund: jest.fn(),
    };
  });

  it('completes a payment successfully', async () => {
    gateway.charge.mockResolvedValue({
      success: true,
      transactionId: 'txn_123',
    });

    const result = await service.processPayment(
      gateway,
      120,
      '4242424242424242',
      '12/30',
    );

    expect(result).toBe('txn_123');
    expect(gateway.charge).toHaveBeenCalledWith({
      amount: 120,
      cardNumber: '4242424242424242',
    });
  });

  it('throws when provider reports a failed payment', async () => {
    gateway.charge.mockResolvedValue({ success: false });

    await expect(
      service.processPayment(gateway, 75, '4000000000000002', '11/24'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('handles refunds via the provider', async () => {
    gateway.refund.mockResolvedValue({ success: true });

    const result = await service.refundPayment(gateway, 'txn_ref_001', 50);

    expect(result).toBe(true);
    expect(gateway.refund).toHaveBeenCalledWith({
      transactionId: 'txn_ref_001',
      amount: 50,
    });
  });
});
