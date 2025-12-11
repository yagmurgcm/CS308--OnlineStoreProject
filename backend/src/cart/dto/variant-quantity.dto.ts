import { IsInt, Min } from 'class-validator';

export class VariantQuantityDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
