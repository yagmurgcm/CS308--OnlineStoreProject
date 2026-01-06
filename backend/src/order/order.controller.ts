import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoiceService } from './invoice.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ReturnItemsDto } from './dto/return-items.dto';

type RequestWithUser = {
  user?: {
    userId?: number;
    role?: string;
    email?: string;
  };
};

const isReturnApprover = (user?: RequestWithUser['user']) => {
  if (!user) return false;
  const role = (user.role ?? '').toUpperCase();
  if (role === 'SALES_MANAGER' || role === 'ADMIN') return true;
  const email = user.email?.toLowerCase();
  return email === 'admin@gmail.com' || email === 'product@gmail.com';
};

const assertReturnApprover = (req: RequestWithUser) => {
  if (!isReturnApprover(req.user)) {
    throw new ForbiddenException('Insufficient permissions');
  }
};

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

  // ============ ADMIN ENDPOINT'LERİ ============

  // GET: Tüm siparişler (Admin)
  @Get('admin/all')
  async getAllOrders() {
    return this.orderService.getAllOrders();
  }

  // PATCH: Sipariş durumunu güncelle (Admin)
  @Patch('admin/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.orderService.updateOrderStatus(id, status);
  }

  // ============ NORMAL ENDPOINT'LER ============

  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.orderService.getOrderById(id, req.user.userId);
  }

  @Post(':id/cancel')
  async cancelOrder(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.orderService.cancelOrder(id, req.user.userId);
  }

  @Post(':id/return')
  async returnOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() dto: ReturnItemsDto,
  ) {
    return this.orderService.returnItems(id, req.user.userId, dto.items);
  }

  @Post(':id/return-request')
  async createReturnRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() dto: ReturnItemsDto,
  ) {
    return this.orderService.createReturnRequest(
      id,
      req.user.userId,
      dto.items,
      dto.reason,
    );
  }

  // ============ RETURN REQUESTS (ADMIN) ============

  @Get('admin/return-requests')
  async getReturnRequests(@Req() req: RequestWithUser) {
    assertReturnApprover(req);
    return this.orderService.getAllReturnRequests();
  }

  @Patch('admin/return-requests/:id/status')
  async updateReturnRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Req() req: RequestWithUser,
  ) {
    assertReturnApprover(req);
    return this.orderService.updateReturnRequestStatus(
      id,
      status as 'approved' | 'rejected',
    );
  }

  @Get('admin/returns')
  async getReturnOrders(@Req() req: RequestWithUser) {
    assertReturnApprover(req);
    return this.orderService.getReturnOrders();
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
