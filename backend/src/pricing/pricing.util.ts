type PricingProduct = {
  price?: number | string | null;
  discountRate?: number | string | null;
  discountedPrice?: number | string | null;
};

type PricingVariant = {
  price?: number | string | null;
} | null | undefined;

export type PricingResult = {
  originalUnitPrice: number;
  effectiveUnitPrice: number;
  discountRateApplied: number;
  isDiscounted: boolean;
};

const coerceNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const roundCurrency = (value: number): number =>
  Math.round(value * 100) / 100;

export function computeEffectiveUnitPrice(
  product: PricingProduct | null | undefined,
  variant?: PricingVariant,
): PricingResult {
  const basePrice = variant?.price ?? product?.price;
  const originalUnitPrice = roundCurrency(coerceNumber(basePrice));

  const discountedRaw = product?.discountedPrice;
  const discounted =
    discountedRaw === null || discountedRaw === undefined
      ? null
      : coerceNumber(discountedRaw);

  if (discounted !== null) {
    const effectiveUnitPrice = roundCurrency(Math.max(0, discounted));
    const discountRateApplied =
      originalUnitPrice > 0
        ? Math.min(
            Math.max(
              ((originalUnitPrice - effectiveUnitPrice) / originalUnitPrice) *
                100,
              0,
            ),
            100,
          )
        : 0;
    return {
      originalUnitPrice,
      effectiveUnitPrice,
      discountRateApplied,
      isDiscounted:
        discountRateApplied > 0 && effectiveUnitPrice < originalUnitPrice,
    };
  }

  const rawRate = coerceNumber(product?.discountRate);
  const ratePercent = rawRate > 0 ? (rawRate <= 1 ? rawRate * 100 : rawRate) : 0;
  const clampedRate = Math.min(Math.max(ratePercent, 0), 100);
  const rateFraction = clampedRate > 0 ? clampedRate / 100 : 0;

  const discountedPrice =
    rateFraction > 0
      ? roundCurrency(originalUnitPrice * (1 - rateFraction))
      : originalUnitPrice;
  const effectiveUnitPrice = Math.max(0, discountedPrice);

  return {
    originalUnitPrice,
    effectiveUnitPrice,
    discountRateApplied: clampedRate,
    isDiscounted: clampedRate > 0 && effectiveUnitPrice < originalUnitPrice,
  };
}
