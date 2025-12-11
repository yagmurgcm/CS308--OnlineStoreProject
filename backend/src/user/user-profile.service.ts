import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

export type UpdateUserProfileDto = Partial<
  Pick<User, 'name' | 'email' | 'phoneNumber'>
>;

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getUserProfile(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserProfile(
    userId: number,
    payload: UpdateUserProfileDto,
  ): Promise<User> {
    const user = await this.getUserProfile(userId);

    if (payload.email && payload.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: payload.email },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email already exists');
      }
    }

    const updatedUser = { ...user, ...payload };
    return this.usersRepository.save(updatedUser);
  }
}
