import { IsInt, Min, IsUUID } from 'class-validator';

export class AddItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

