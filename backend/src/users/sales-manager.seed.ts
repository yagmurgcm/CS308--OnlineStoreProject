import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

@Injectable()
export class SalesManagerSeedService implements OnModuleInit {
  private readonly logger = new Logger(SalesManagerSeedService.name);
  private readonly email = 'sales.manager@gmail.com';
  private readonly password = 'sales.manager123';

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    const existing = await this.usersService.findByEmail(this.email, {
      withHash: true,
    });

    const hashed = await bcrypt.hash(this.password, 10);

    if (!existing) {
      await this.usersService.create({
        name: 'Sales Manager',
        email: this.email,
        password: hashed,
        role: 'SALES_MANAGER',
      });
      this.logger.log('Seeded Sales Manager account');
      return;
    }

    const passwordMatches = await bcrypt.compare(
      this.password,
      existing.password,
    );

    const needsUpdate =
      !passwordMatches ||
      existing.role !== 'SALES_MANAGER' ||
      existing.name !== 'Sales Manager';

    if (!needsUpdate) {
      return;
    }

    await this.usersService.update(existing.id, {
      name: 'Sales Manager',
      password: hashed,
      role: 'SALES_MANAGER',
    });
    this.logger.log('Sales Manager account updated');
  }
}
