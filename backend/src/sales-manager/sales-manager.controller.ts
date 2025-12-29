import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesManagerService } from './sales-manager.service';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { GetFinanceSummaryQueryDto } from './dto/get-finance-summary-query.dto';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';

@Controller('sales-manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SALES_MANAGER', 'ADMIN')
export class SalesManagerController {
  constructor(private readonly service: SalesManagerService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('invoices')
  getInvoices(@Query() query: GetInvoicesQueryDto) {
    return this.service.getInvoices(query);
  }

  @Get('invoices/:id/pdf')
  async getInvoicePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdf = await this.service.getInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${id}.pdf"`,
    );
    return res.send(pdf);
  }

  @Get('finance/summary')
  getFinanceSummary(@Query() query: GetFinanceSummaryQueryDto) {
    return this.service.getFinanceSummary(query);
  }

  @Post('discounts')
  applyDiscount(@Body() dto: ApplyDiscountDto) {
    return this.service.applyDiscount(dto);
  }
}
