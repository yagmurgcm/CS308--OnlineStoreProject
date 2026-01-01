import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './wishlist-item.entity';
import { Product } from '../product/entities/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepo: Repository<WishlistItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async list(userId: number): Promise<WishlistItem[]> {
    return this.wishlistRepo.find({
      where: { userId },
      relations: ['product', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async add(userId: number, productId: number): Promise<WishlistItem> {
    const existing = await this.wishlistRepo.findOne({
      where: { userId, productId },
      relations: ['product'],
    });
    if (existing) {
      return existing;
    }

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    const item = this.wishlistRepo.create({
      userId,
      productId,
      product,
    });
    const saved = await this.wishlistRepo.save(item);
    return this.wishlistRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['product'],
    });
  }

  async remove(userId: number, productId: number): Promise<void> {
    await this.wishlistRepo.delete({ userId, productId });
  }
}
