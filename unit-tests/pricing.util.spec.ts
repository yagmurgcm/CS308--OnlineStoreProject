import { computeEffectiveUnitPrice } from './pricing.util';

describe('computeEffectiveUnitPrice', () => {
  it('returns base price when no discount is applied', () => {
    const pricing = computeEffectiveUnitPrice({ price: 100, discountRate: 0 });

    expect(pricing.originalUnitPrice).toBe(100);
    expect(pricing.effectiveUnitPrice).toBe(100);
    expect(pricing.discountRateApplied).toBe(0);
    expect(pricing.isDiscounted).toBe(false);
  });

  it('applies fractional discount to variant price', () => {
    const pricing = computeEffectiveUnitPrice(
      { price: 100, discountRate: 0.2 },
      { price: 120 },
    );

    expect(pricing.originalUnitPrice).toBe(120);
    expect(pricing.effectiveUnitPrice).toBe(96);
  });

  it('applies fractional discount to product price when variant is missing', () => {
    const pricing = computeEffectiveUnitPrice({ price: 100, discountRate: 0.2 });

    expect(pricing.originalUnitPrice).toBe(100);
    expect(pricing.effectiveUnitPrice).toBe(80);
  });
});
