import { IsIn, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['processing', 'in-transit', 'delivered'])
  status: string;
}
