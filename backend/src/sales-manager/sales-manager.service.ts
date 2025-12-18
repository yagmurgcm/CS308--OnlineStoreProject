import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { ApplyDiscountDto } from './dto/apply-discount.dto';

@Injectable()
export class SalesManagerService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  getDashboard() {
    return {
      title: 'Sales Manager Dashboard',
      actions: [
        {
          label: 'Apply Discount',
          description: 'Configure discount campaigns for eligible products.',
          href: '/sales-manager/discounts',
        },
        {
          label: 'View Invoices',
          description: 'Review and export the latest customer invoices.',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  async applyDiscount(dto: ApplyDiscountDto) {
    const ids = Array.from(
      new Set(dto.productIds.filter((id) => Number.isInteger(id))),
    );
    if (!ids.length) {
      throw new BadRequestException('At least one product must be selected');
    }

    const discountRate = Math.min(Math.max(dto.discountRate, 0), 90);
    const multiplier = discountRate / 100;

    const products = await this.productRepo.find({
      where: { id: In(ids) },
    });
    if (!products.length) {
      throw new BadRequestException('No matching products were found');
    }

    for (const product of products) {
      const basePrice = Number(product.price) || 0;
      product.discountRate = discountRate;
      product.discountedPrice =
        discountRate > 0
          ? Number((basePrice * (1 - multiplier)).toFixed(2))
          : null;
    }

    await this.productRepo.save(products);

    return {
      updatedCount: products.length,
      discountRate,
    };
  }
}
