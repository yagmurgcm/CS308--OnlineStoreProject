import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './product.entity';


// Product Endpoints

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

// GET endpoint (all products)
  @Get()
  findAll(): Promise<Product[]> {
    return this.productService.findAll();
  }

  // GET endpoint (get one product by id)
  @Get(':id')
    findOne(@Param('id') id: string): Promise<Product | null> {
    return this.productService.findOne(Number(id));
  }
  
  // POST endpoint (add new product)
  @Post()
  create(@Body() product: Product): Promise<Product> {
    return this.productService.create(product);
  }

  // DELETE endpoint (delete product by id)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.productService.remove(Number(id));
  }
}
