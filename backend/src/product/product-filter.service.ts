import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from './entities/product.entity';

export type ProductFilterOptions = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string | number | boolean>;
};

@Injectable()
export class ProductFilterService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async filterProducts(options: ProductFilterOptions = {}): Promise<Product[]> {
    const products = await this.productRepository.find();
    return products.filter((product) => this.applyFilters(product, options));
  }

  private applyFilters(
    product: Product,
    options: ProductFilterOptions,
  ): boolean {
    const price = Number(product.price ?? 0);

    if (options.category && product.category !== options.category) {
      return false;
    }

    if (options.minPrice !== undefined && price < options.minPrice) {
      return false;
    }

    if (options.maxPrice !== undefined && price > options.maxPrice) {
      return false;
    }

    if (options.attributes) {
      const isMatching = Object.entries(options.attributes).every(
        ([key, value]) => {
          const productValue = (product as Record<string, unknown>)[key];
          return String(productValue) === String(value);
        },
      );
      if (!isMatching) return false;
    }

    return true;
  }
}
