import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class ApplyDiscountDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  productIds: number[];

  @IsInt()
  @Min(0)
  @Max(90)
  discountRate: number;
}
