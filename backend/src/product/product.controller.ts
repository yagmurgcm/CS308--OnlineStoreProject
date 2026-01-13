import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Product Endpoints

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // ============ PUBLIC ENDPOINTS (NO AUTH) ============

  // GET endpoint (all products) - Public
  @Get()
  findAll(
    @Query() query: GetProductsQueryDto,
  ): Promise<{
    items: Product[];
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    return this.productService.findAll(query);
  }

  // GET endpoint (get one product by id) - Public
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Product | null> {
    return this.productService.findOne(id);
  }

  // ============ ADMIN ENDPOINTS (REQUIRE AUTH) ============

  // POST endpoint (add new product) - Admin only
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() product: CreateProductDto): Promise<Product> {
    return this.productService.create(product as Product);
  }

  // PUT endpoint (update product by id) - Admin only
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() product: UpdateProductDto,
  ): Promise<Product> {
    console.log(`🚀 [BACKEND CONTROLLER] Update request received for Product ID: ${id}`);
    console.log(`📦 [BACKEND CONTROLLER] Payload:`, product);
    return this.productService.update(id, product);
  }

  // DELETE endpoint (delete product by id) - Admin only
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productService.remove(id);
  }

  // POST endpoint (create variant for product) - Admin only
  @UseGuards(JwtAuthGuard)
  @Post(':productId/variant')
  createVariant(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() variant: any,
  ): Promise<any> {
    return this.productService.createVariant(productId, variant);
  }

  // PUT endpoint (update variant by id) - Admin only
  @UseGuards(JwtAuthGuard)
  @Put('variant/:variantId')
  updateVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() variant: any,
  ): Promise<any> {
    return this.productService.updateVariant(variantId, variant);
  }

  // DELETE endpoint (delete variant by id) - Admin only
  @UseGuards(JwtAuthGuard)
  @Delete('variant/:variantId')
  removeVariant(@Param('variantId', ParseIntPipe) variantId: number): Promise<void> {
    return this.productService.removeVariant(variantId);
  }
}
