import { IsInt, Min, IsOptional, IsString } from 'class-validator';

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

  // --- BU İKİSİNİ EKLE ---
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;
}
