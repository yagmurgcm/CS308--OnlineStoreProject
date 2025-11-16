import { Controller, Post, Get, Param, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('checkout')
  async checkout(@Req() req) {
    return this.orderService.checkout(req.user.id);
  }

  @Get()
  async getUserOrders(@Req() req) {
    return this.orderService.getOrdersByUser(req.user.id);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: number) {
    return this.orderService.getOrderById(id);
  }
}
