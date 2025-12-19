import { ArrayNotEmpty, IsArray, IsInt, IsPositive } from 'class-validator';

export class ReturnItemDto {
  @IsInt()
  detailId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class ReturnItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  items: ReturnItemDto[];
}
