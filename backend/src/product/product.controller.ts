import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

// Product Endpoints

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // GET endpoint (all products)
  @Get()
  findAll(@Query() query: GetProductsQueryDto): Promise<Product[]> {
    return this.productService.findAll(query);
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
