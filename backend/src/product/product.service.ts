import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

// Communicating with Database

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Get all products, GET
  findAll(): Promise<Product[]> {
    return this.productRepository.find();
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
