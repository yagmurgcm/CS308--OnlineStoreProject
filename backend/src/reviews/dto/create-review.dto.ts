import { IsNotEmpty, IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number; // 1 ile 5 arası sayı olmalı

  @IsOptional()
  @IsString()
  comment?: string; // Opsiyonel - sadece rating gönderilebilir
}
