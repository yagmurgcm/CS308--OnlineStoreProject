import { IsNotEmpty, IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number; // 0-5 arası: 0 = yorum-only, 1-5 = rating

  @IsOptional()
  @IsString()
  comment?: string; // Opsiyonel - sadece rating gönderilebilir
}
