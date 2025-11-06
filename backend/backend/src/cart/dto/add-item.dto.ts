import { IsInt, Min } from 'class-validator';

export class AddItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
