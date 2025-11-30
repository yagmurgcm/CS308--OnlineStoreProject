import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAll(query: GetProductsQueryDto): Promise<Product[]> {
    const { minPrice, maxPrice, size, sort, category, subcategory } = query;
    console.log("🔥 USING UPDATED SERVICE");

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant');

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    if (subcategory) {
      qb.andWhere("product.subcategory = :subcategory", { subcategory });
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

    if (sort === 'price_asc') {
      qb.orderBy('variant.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy('variant.price', 'DESC');
    } else {
      qb.orderBy('product.id', 'ASC');
    }

    return qb.getMany();
  }

  // --- KRİTİK DÜZENLEME BURADA YAPILDI ---
  // Get product by id, GET
  async findOne(id: number): Promise<Product | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['variants'], // <--- İŞTE BU SATIR EKSİKTİ!
    });

    if (!product) {
       // Opsiyonel: Ürün yoksa hata fırlatabiliriz veya null dönebiliriz.
       // return null; 
       throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
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