import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string, opts?: { withHash?: boolean }): Promise<User | null> {
    if (opts?.withHash) {
      return this.repo.findOne({
        where: { email },
        select: ['id', 'email', 'name', 'password', 'createdAt', 'updatedAt'],
      });
    }
    return this.repo.findOne({ where: { email } });
  }

  create(data: Partial<User>): Promise<User> {
    const u = this.repo.create(data);
    return this.repo.save(u);
  }
}
