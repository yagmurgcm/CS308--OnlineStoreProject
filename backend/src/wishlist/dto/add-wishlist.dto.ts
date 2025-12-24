import { IsInt, Min } from 'class-validator';

export class AddWishlistDto {
  @IsInt()
  @Min(1)
  productId: number;
}
