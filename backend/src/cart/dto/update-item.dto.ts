import { IsInt, Min } from 'class-validator';

export class UpdateItemDto {
  @IsInt()
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
