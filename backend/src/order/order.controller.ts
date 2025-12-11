import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  Body,
  Patch,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoiceService } from './invoice.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post('checkout')
  async checkout(@Req() req, @Body() checkoutDto: CheckoutDto) {
    return this.orderService.checkout(req.user.userId, checkoutDto);
  }

  @Get()
  async getUserOrders(@Req() req) {
    return this.orderService.getOrdersByUser(req.user.userId);
  }

  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.getOrderById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto);
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
