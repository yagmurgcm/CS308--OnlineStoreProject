import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
