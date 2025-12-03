import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoiceService } from './invoice.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post('checkout')
  async checkout(@Req() req) {
    return this.orderService.checkout(req.user.id);
  }

  @Get()
  async getUserOrders(@Req() req) {
    return this.orderService.getOrdersByUser(req.user.id);
  }

  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderById(id);
  }

  @Get(':id/invoice')
  async getInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.buildInvoiceSummary(id);
  }
}
