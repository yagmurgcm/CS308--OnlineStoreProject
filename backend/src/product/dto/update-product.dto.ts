import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subcategory?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;
}
