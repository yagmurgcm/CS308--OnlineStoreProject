import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
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
    return this.orderService.checkout(req.user.userId);
  }

  @Get()
  async getUserOrders(@Req() req) {
    return this.orderService.getOrdersByUser(req.user.userId);
  }

  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderById(id);
  }

  @Get(':id/invoice')
  async getInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Res() res: Response,
  ) {
    await this.orderService.assertOrderOwnership(id, req.user.userId);
    const pdf = await this.invoiceService.generateInvoicePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${id}.pdf"`,
    );
    return res.send(pdf);
  }
}
