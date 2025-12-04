import { IsInt, Min } from 'class-validator';

export class UpdateQuantityDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
