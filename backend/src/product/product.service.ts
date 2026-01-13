import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { Product } from './entities/product.entity';
import { ProductVariant } from './product-variant.entity';
import { Review } from '../reviews/review.entity';
import { OrderDetail } from '../order/order-detail.entity';

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
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(OrderDetail)
    private orderDetailRepository: Repository<OrderDetail>,
  ) { }

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

  // Update product
  async update(id: number, productData: Partial<Product>): Promise<Product> {
    console.log(`🔄 [BACKEND] Updating product ID: ${id}`);
    console.log(`📝 [BACKEND] Update data received:`, productData);
    
    const existing = await this.productRepository.findOne({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    // Alanları güvenli şekilde güncelle (relations hariç)
    existing.name = productData.name ?? existing.name;
    existing.category = productData.category ?? existing.category;
    existing.subcategory = productData.subcategory ?? existing.subcategory;
    existing.description = productData.description ?? existing.description;
    existing.price = productData.price ?? existing.price;
    existing.stock = productData.stock ?? existing.stock;
    existing.isActive = productData.isActive ?? existing.isActive;
    existing.image = productData.image ?? existing.image;

    console.log(`✅ [BACKEND] Product updated in DB:`, {
      id: existing.id,
      name: existing.name,
      description: existing.description,
    });

    // Only update scalar columns, not relations
    return this.productRepository.save(existing, { reload: false });
  }

  // Delete product
  async remove(id: number): Promise<void> {
    // Check if product exists
    const product = await this.productRepository.findOne({
      where: { id },
    });
    
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    // Use transaction to safely delete product, variants, reviews, and update order details
    await this.productRepository.manager.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const reviewRepo = manager.getRepository(Review);
      const orderDetailRepo = manager.getRepository(OrderDetail);

      // Set productId to NULL in order details (preserve order history)
      await orderDetailRepo.update(
        { productId: id },
        { productId: null },
      );

      // Delete all reviews for this product
      await reviewRepo.delete({ productId: id });

      // Get all variant IDs for this product
      const variants = await variantRepo.find({
        where: { product: { id } },
        select: ['id'],
      });

      // Delete all variants (this will cascade delete cart items)
      if (variants.length > 0) {
        const variantIds = variants.map(v => v.id);
        await variantRepo.delete(variantIds);
      }

      // Delete the product
      await productRepo.delete(id);
    });
  }

  // Delete variant
  async removeVariant(variantId: number): Promise<void> {
    const result = await this.variantRepository.delete(variantId);
    if (result.affected === 0) {
      throw new NotFoundException(`Variant #${variantId} not found`);
    }
  }

  // Create variant
  async createVariant(productId: number, variantData: Partial<ProductVariant>): Promise<ProductVariant> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }
    const variant = this.variantRepository.create({
      ...variantData,
      product: product,
    } as ProductVariant);
    return this.variantRepository.save(variant);
  }

  // Update variant
  async updateVariant(variantId: number, variant: Partial<ProductVariant>): Promise<ProductVariant> {
    const existing = await this.variantRepository.findOne({
      where: { id: variantId },
    });
    if (!existing) {
      throw new NotFoundException(`Variant #${variantId} not found`);
    }
    const updated = { ...existing, ...variant, id: variantId };
    return this.variantRepository.save(updated);
  }
}
