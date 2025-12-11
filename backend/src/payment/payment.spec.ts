import { BadRequestException } from '@nestjs/common';

import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService();
  });

  it('validateCardNumber should accept valid Luhn numbers', () => {
    expect(service.validateCardNumber('4242 4242 4242 4242')).toBe(true);
    expect(service.validateCardNumber('4000 0000 0000 0002')).toBe(true);
  });

  it('validateExpiration should detect past and future dates', () => {
    const reference = new Date('2024-01-01T00:00:00Z');
    expect(service.validateExpiration('12/29', reference)).toBe(true);
    expect(service.validateExpiration('01/20', reference)).toBe(false);
  });

  it('calculateOrderTotal should accumulate line items and shipping', () => {
    const total = service.calculateOrderTotal(
      [
        { price: 100, quantity: 2 },
        { price: '59.9', quantity: 1 },
      ],
      15,
    );
    expect(total).toBeCloseTo(274.9);
  });

  it('applyDiscount should respect percentage and flat rules', () => {
    expect(service.applyDiscount(200, { type: 'percentage', value: 25 })).toBe(150);
    expect(service.applyDiscount(50, { type: 'flat', value: 30 })).toBe(20);
    expect(service.applyDiscount(10, { type: 'flat', value: 25 })).toBe(0);
  });

  it('should throw on invalid card information', () => {
    expect(() => service.assertPayment('123456', '01/20')).toThrow(BadRequestException);
  });
});
