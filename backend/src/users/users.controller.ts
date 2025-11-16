import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

// Exposes user-related HTTP endpoints
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getProfile(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const { password, ...profile } = user;
    return profile;
  }
}
