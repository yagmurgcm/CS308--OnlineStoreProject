import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';

interface UpdateProfileBody {
  name?: string;
  taxId?: string;
  homeAddress?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  async getProfile(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const { password, ...safe } = user;
    return safe;
  }

  @Patch(':id')
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProfileBody,
  ) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found');
    
    const updateData: Partial<{ name: string; taxId: string | null; homeAddress: string | null }> = {};
    
    if (body.name !== undefined && body.name !== '') {
      updateData.name = body.name;
    }
    if (body.taxId !== undefined) {
      updateData.taxId = body.taxId || null;
    }
    if (body.homeAddress !== undefined) {
      updateData.homeAddress = body.homeAddress || null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.users.update(id, updateData);
    }
    
    const updated = await this.users.findById(id);
    const { password, ...safe } = updated!;
    return safe;
  }
}
