import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findMainCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['children', 'parent'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async findSubcategories(parentId: number): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { parentId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async create(data: { name: string; description?: string; parentId?: number }): Promise<Category> {
    const category = this.categoryRepo.create({
      name: data.name,
      description: data.description ?? undefined,
      parentId: data.parentId ?? undefined,
    });
    const saved = await this.categoryRepo.save(category);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, data: Partial<Category>): Promise<Category> {
    const category = await this.findById(id);
    Object.assign(category, data);
    const saved = await this.categoryRepo.save(category);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async delete(id: number): Promise<void> {
    const category = await this.findById(id);
    // Soft delete - just deactivate
    category.isActive = false;
    await this.categoryRepo.save(category);
  }

  async getHierarchy(): Promise<Category[]> {
    // Get all main categories with their subcategories
    const mainCategories = await this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Filter inactive children
    return mainCategories.map((cat) => ({
      ...cat,
      children: (cat.children || []).filter((child) => child.isActive),
    }));
  }
}

