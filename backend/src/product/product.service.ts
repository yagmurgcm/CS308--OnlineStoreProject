import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

// Communicating with Database

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Get all products, GET
  async findAll(query: GetProductsQueryDto): Promise<Product[]> {
    const { minPrice, maxPrice, size, sort } = query;
    const qb = this.productRepository
      .createQueryBuilder('product')
      .where('product.isActive = :active', { active: true });

    let useVariantPrice = false;

    if (size) {
      qb.innerJoin('product.variants', 'variant', 'variant.size = :size', {
        size,
      });
      useVariantPrice = true;
    }

    if (minPrice !== undefined) {
      qb.andWhere(
        useVariantPrice
          ? 'variant.price >= :minPrice'
          : 'product.price >= :minPrice',
        { minPrice },
      );
    }

    if (maxPrice !== undefined) {
      qb.andWhere(
        useVariantPrice
          ? 'variant.price <= :maxPrice'
          : 'product.price <= :maxPrice',
        { maxPrice },
      );
    }

    if (sort === 'price_asc') {
      qb.orderBy(useVariantPrice ? 'variant.price' : 'product.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy(useVariantPrice ? 'variant.price' : 'product.price', 'DESC');
    } else {
      qb.orderBy('product.id', 'ASC');
    }

    return qb.getMany();
  }
  
  // Get product by id, GET
  findOne(id: number): Promise<Product | null> {
  return this.productRepository.findOneBy({ id });
}

   // Add new product, POST
  async create(product: Product): Promise<Product> {
    return this.productRepository.save(product);
  }
 
  // Delete product by id, DELETE
  async remove(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }
}
