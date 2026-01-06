import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

type RequestWithUser = {
  user?: {
    userId?: number;
    role?: string;
  };
};

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly supportGateway: SupportGateway,
  ) {}

  // ============ CUSTOMER/GUEST ENDPOINTS ============

  // Create a new conversation (optional auth - guest allowed)
  @Post('conversations')
  @UseGuards(OptionalJwtAuthGuard)
  async createConversation(
    @Req() req: RequestWithUser,
    @Body() dto: CreateConversationDto,
  ) {
    const userId = req.user?.userId || null;
    const conversation = await this.supportService.createConversation(userId, dto);
    // Notify agents about new conversation
    this.supportGateway.notifyNewConversation(conversation.id);
    return conversation;
  }

  // Get customer's conversations (requires auth)
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getCustomerConversations(@Req() req: RequestWithUser) {
    const userId = req.user?.userId || null;
    return this.supportService.getCustomerConversations(userId);
  }

  // Get a specific conversation (requires auth)
  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.userId || null;
    const isAgent = req.user?.role === 'SUPPORT_AGENT';
    return this.supportService.getConversationById(id, userId, isAgent);
  }

  // Send a message (requires auth)
  @Post('conversations/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  async sendMessage(
    @Param('id', ParseIntPipe) conversationId: number,
    @Req() req: RequestWithUser,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user?.userId || null;
    const role = req.user?.role;

    let senderType: 'customer' | 'agent' | 'guest';
    if (role === 'SUPPORT_AGENT') {
      senderType = 'agent';
    } else if (userId) {
      senderType = 'customer';
    } else {
      senderType = 'guest';
    }

    // TODO: Handle file uploads (files parameter)
    // For now, just send the message without attachments

    const message = await this.supportService.sendMessage(
      conversationId,
      userId,
      senderType,
      dto,
    );

    // Notify via WebSocket
    this.supportGateway.notifyNewMessage(message);
    if (senderType === 'customer' || senderType === 'guest') {
      this.supportGateway.notifyConversationUpdate(conversationId);
    }

    return message;
  }

  // ============ AGENT ENDPOINTS ============

  // Get open conversations (queue)
  @Get('agent/queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPPORT_AGENT', 'ADMIN')
  async getOpenConversations() {
    return this.supportService.getOpenConversations();
  }

  // Get agent's conversations
  @Get('agent/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPPORT_AGENT', 'ADMIN')
  async getAgentConversations(@Req() req: RequestWithUser) {
    const agentId = req.user?.userId;
    if (!agentId) {
      throw new Error('Agent ID not found');
    }
    return this.supportService.getAgentConversations(agentId);
  }

  // Claim a conversation
  @Patch('agent/conversations/:id/claim')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPPORT_AGENT', 'ADMIN')
  async claimConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Req() req: RequestWithUser,
  ) {
    const agentId = req.user?.userId;
    if (!agentId) {
      throw new Error('Agent ID not found');
    }
    const conversation = await this.supportService.claimConversation(conversationId, agentId);
    // Notify via WebSocket
    this.supportGateway.notifyConversationStatusChange(conversationId, 'claimed');
    this.supportGateway.notifyConversationUpdate(conversationId);
    return conversation;
  }

  // Get customer context
  @Get('agent/conversations/:id/customer-context')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPPORT_AGENT', 'ADMIN')
  async getCustomerContext(
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    const conversation = await this.supportService.getConversationById(
      conversationId,
      null,
      true,
    );

    if (!conversation.customerId) {
      return { customer: null, recentOrders: [], wishlist: [] };
    }

    return this.supportService.getCustomerContext(conversation.customerId);
  }

  // Close a conversation
  @Patch('agent/conversations/:id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPPORT_AGENT', 'ADMIN')
  async closeConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Req() req: RequestWithUser,
  ) {
    const agentId = req.user?.userId;
    if (!agentId) {
      throw new Error('Agent ID not found');
    }
    const conversation = await this.supportService.closeConversation(conversationId, agentId);
    // Notify via WebSocket
    this.supportGateway.notifyConversationStatusChange(conversationId, 'closed');
    return conversation;
  }
}
