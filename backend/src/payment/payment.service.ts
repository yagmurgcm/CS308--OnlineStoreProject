import { BadRequestException } from '@nestjs/common';

export type PaymentLineItem = {
  price: number | string;
  quantity: number;
};

export type DiscountRule =
  | { type: 'percentage'; value: number }
  | { type: 'flat'; value: number };

export type PaymentGatewayChargePayload = {
  amount: number;
  cardNumber: string;
};

export type PaymentGatewayChargeResult = {
  success: boolean;
  transactionId?: string;
};

export type PaymentGatewayRefundPayload = {
  transactionId: string;
  amount: number;
};

export type PaymentGatewayRefundResult = {
  success: boolean;
};

export interface PaymentGateway {
  charge(payload: PaymentGatewayChargePayload): Promise<PaymentGatewayChargeResult>;
  refund(payload: PaymentGatewayRefundPayload): Promise<PaymentGatewayRefundResult>;
}

export class PaymentService {
  validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(digits)) {
      return false;
    }

    let checksum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = Number(digits[i]);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      checksum += digit;
      shouldDouble = !shouldDouble;
    }
    return checksum % 10 === 0;
  }

  validateExpiration(expiration: string, referenceDate = new Date()): boolean {
    const match = expiration.match(/^(\d{2})\/(\d{2}|\d{4})$/);
    if (!match) return false;
    const month = Number(match[1]);
    if (month < 1 || month > 12) return false;
    const year = Number(match[2].length === 2 ? `20${match[2]}` : match[2]);

    const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
    return expiryDate >= referenceDate;
  }

  calculateOrderTotal(items: PaymentLineItem[], shipping = 0): number {
    const subtotal = items.reduce((sum, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + price * item.quantity;
    }, 0);
    return Number((subtotal + shipping).toFixed(2));
  }

  applyDiscount(total: number, discount: DiscountRule | null): number {
    if (!discount) return Number(total.toFixed(2));
    if (discount.type === 'percentage') {
      const delta = (total * discount.value) / 100;
      return Number(Math.max(total - delta, 0).toFixed(2));
    }
    return Number(Math.max(total - discount.value, 0).toFixed(2));
  }

  assertPayment(cardNumber: string, expiration: string): void {
    const cardValid = this.validateCardNumber(cardNumber);
    const expiryValid = this.validateExpiration(expiration);
    if (!cardValid || !expiryValid) {
      throw new BadRequestException('Invalid payment information');
    }
  }

  async processPayment(
    gateway: PaymentGateway,
    amount: number,
    cardNumber: string,
    expiration: string,
  ): Promise<string> {
    this.assertPayment(cardNumber, expiration);
    const result = await gateway.charge({ amount, cardNumber });
    if (!result.success || !result.transactionId) {
      throw new BadRequestException('Payment failed');
    }
    return result.transactionId;
  }

  async refundPayment(
    gateway: PaymentGateway,
    transactionId: string,
    amount: number,
  ): Promise<boolean> {
    const result = await gateway.refund({ transactionId, amount });
    if (!result.success) {
      throw new BadRequestException('Refund failed');
    }
    return true;
  }
}
