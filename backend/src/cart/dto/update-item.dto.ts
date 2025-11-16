import { IsInt, Min } from 'class-validator';

export class UpdateItemDto {
  @IsInt()
  itemId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
