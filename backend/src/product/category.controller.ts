import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Public - get all categories with hierarchy
  @Get()
  async findAll() {
    return this.categoryService.getHierarchy();
  }

  // Public - get main categories only
  @Get('main')
  async findMainCategories() {
    return this.categoryService.findMainCategories();
  }

  // Public - get category by ID
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findById(id);
  }

  // Public - get subcategories of a category
  @Get(':id/subcategories')
  async findSubcategories(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findSubcategories(id);
  }

  // Admin only - create category
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async create(
    @Body() body: { name: string; description?: string; parentId?: number },
  ) {
    return this.categoryService.create(body);
  }

  // Admin only - update category
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; isActive?: boolean; sortOrder?: number },
  ) {
    return this.categoryService.update(id, body);
  }

  // Admin only - delete category (soft delete)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.delete(id);
    return { success: true };
  }
}

