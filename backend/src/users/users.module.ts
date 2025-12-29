import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SalesManagerSeedService } from './sales-manager.seed';
import { SupportAgentSeedService } from './support-agent.seed';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, SalesManagerSeedService, SupportAgentSeedService],
  controllers: [UsersController],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
