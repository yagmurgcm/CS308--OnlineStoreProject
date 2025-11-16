import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  private readonly defaultRelations = ['variants'];

  findAll(): Promise<Product[]> {
    return this.productRepository.find({ relations: this.defaultRelations });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: this.defaultRelations,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        'Product name already exists, add a variant instead',
      );
    }

    const product = this.productRepository.create({
      name: dto.name,
      category: dto.category,
      subcategory: dto.subcategory,
      description: dto.description,
      image: dto.image,
      variants: dto.variants?.map((variant) =>
        this.variantRepository.create(variant),
      ),
    });

    return this.productRepository.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.name !== undefined && dto.name !== product.name) {
      const nameExists = await this.productRepository.findOne({
        where: { name: dto.name },
      });
      if (nameExists) {
        throw new ConflictException('Another product already uses this name');
      }
    }
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.category !== undefined) product.category = dto.category;
    if (dto.subcategory !== undefined) product.subcategory = dto.subcategory;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.image !== undefined) product.image = dto.image;

    await this.productRepository.save(product);
    return this.findOne(id);
  }

  async addVariant(
    productId: number,
    dto: CreateProductVariantDto,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const duplicate = await this.variantRepository.findOne({
      where: {
        product: { id: productId },
        color: dto.color,
        size: dto.size,
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'Variant with same color and size already exists',
      );
    }

    const variant = this.variantRepository.create({
      ...dto,
      product,
    });
    await this.variantRepository.save(variant);
    return this.findOne(productId);
  }

  async removeVariant(productId: number, variantId: number): Promise<Product> {
    const variant = await this.variantRepository.findOne({
      where: { id: variantId, product: { id: productId } },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found for this product');
    }
    await this.variantRepository.remove(variant);
    return this.findOne(productId);
  }

  async remove(id: number): Promise<void> {
    const res = await this.productRepository.delete(id);
    if (!res.affected) {
      throw new NotFoundException('Product not found');
    }
  }
}
