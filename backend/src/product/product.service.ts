import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { Product } from './entities/product.entity';

type PagedProducts = {
  items: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // List and filter products with pagination and sorting
  async findAll(query: GetProductsQueryDto): Promise<PagedProducts> {
    const {
      minPrice,
      maxPrice,
      size,
      sort,
      category,
      subcategory,
      search,
      page = 1,
      limit = 10,
    } = query;

    const pageNumber = page > 0 ? page : 1;
    const pageSize = limit > 0 ? limit : 10;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .distinct(true);

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    if (subcategory) {
      qb.andWhere('product.subcategory = :subcategory', { subcategory });
    }

    if (size) {
      qb.andWhere('variant.size = :size', { size });
    }

    if (minPrice !== undefined) {
      qb.andWhere('variant.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('variant.price <= :maxPrice', { maxPrice });
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(product.name) LIKE :term
          OR LOWER(product.description) LIKE :term
          OR LOWER(variant.color) LIKE :term
          OR LOWER(variant.size) LIKE :term)`,
        { term },
      );
    }

    if (sort === 'price_asc') {
      qb.orderBy('variant.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy('variant.price', 'DESC');
    } else if (sort === 'rating') {
      qb.orderBy('product.averageRating', 'DESC');
    } else if (sort === 'popularity') {
      qb.orderBy('product.reviewCount', 'DESC');
    } else {
      qb.orderBy('product.id', 'ASC');
    }

    qb.skip((pageNumber - 1) * pageSize).take(pageSize);

    const [items, totalCount] = await qb.getManyAndCount();

    return {
      items,
      totalCount,
      page: pageNumber,
      pageSize,
    };
  }

  // Fetch single product
  async findOne(id: number): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['variants', 'reviews', 'reviews.user'],
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  // Create product
  async create(product: Product): Promise<Product> {
    return this.productRepository.save(product);
  }

  // Delete product
  async remove(id: number): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product #${id} not found`);
    }
  }
}
