import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';


// Exports UsersService and User entity

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(user: Pick<User, 'name' | 'email' | 'password'>): Promise<User> {
    const exists = await this.findByEmail(user.email);
    if (exists) throw new ConflictException('Email already registered');
    const entity = this.userRepo.create(user);
    return this.userRepo.save(entity);
  }
}

