import { IsInt, Min, IsOptional } from 'class-validator';

export class AddItemDto {
  @IsOptional()
  @IsInt()
  variantId?: number;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
