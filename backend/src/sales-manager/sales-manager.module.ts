import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesManagerController } from './sales-manager.controller';
import { SalesManagerService } from './sales-manager.service';
import { RolesGuard } from '../auth/roles.guard';
import { Product } from '../product/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [SalesManagerController],
  providers: [SalesManagerService, RolesGuard],
})
export class SalesManagerModule {}
