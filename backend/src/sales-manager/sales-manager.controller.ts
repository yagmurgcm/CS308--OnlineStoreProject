import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesManagerService } from './sales-manager.service';
import { ApplyDiscountDto } from './dto/apply-discount.dto';

@Controller('sales-manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SALES_MANAGER')
export class SalesManagerController {
  constructor(private readonly service: SalesManagerService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Post('discounts')
  applyDiscount(@Body() dto: ApplyDiscountDto) {
    return this.service.applyDiscount(dto);
  }
}
