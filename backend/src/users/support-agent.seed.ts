import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

@Injectable()
export class SupportAgentSeedService implements OnModuleInit {
  private readonly logger = new Logger(SupportAgentSeedService.name);
  private readonly email = 'agent@gmail.com';
  private readonly password = '123456';

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    const existing = await this.usersService.findByEmail(this.email, {
      withHash: true,
    });

    const hashed = await bcrypt.hash(this.password, 10);

    if (!existing) {
      await this.usersService.create({
        name: 'Support Agent',
        email: this.email,
        password: hashed,
        role: 'SUPPORT_AGENT',
      });
      this.logger.log('Seeded Support Agent account');
      return;
    }

    const passwordMatches = await bcrypt.compare(
      this.password,
      existing.password,
    );

    const needsUpdate =
      !passwordMatches ||
      existing.role !== 'SUPPORT_AGENT' ||
      existing.name !== 'Support Agent';

    if (!needsUpdate) {
      return;
    }

    await this.usersService.update(existing.id, {
      name: 'Support Agent',
      password: hashed,
      role: 'SUPPORT_AGENT',
    });
    this.logger.log('Support Agent account updated');
  }
}




