import { validate } from 'class-validator';

import { VariantQuantityDto } from './variant-quantity.dto';

describe('VariantQuantityDto', () => {
  it('accepts positive quantity', async () => {
    const dto = new VariantQuantityDto();
    dto.variantId = 3;
    dto.quantity = 1;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects non-positive quantity', async () => {
    const dto = new VariantQuantityDto();
    dto.variantId = 3;
    dto.quantity = 0;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toBeDefined();
  });
});
