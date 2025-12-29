import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ChatAttachment } from './chat-attachment.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UsersService } from '../users/users.service';
import { Order } from '../order/order.entity';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ChatAttachment)
    private readonly attachmentRepo: Repository<ChatAttachment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(WishlistItem)
    private readonly wishlistRepo: Repository<WishlistItem>,
    private readonly usersService: UsersService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // Create a new conversation (customer or guest)
  async createConversation(
    userId: number | null,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      customerId: userId,
      status: 'open',
      guestEmail: dto.guestEmail || null,
      guestName: dto.guestName || null,
    });

    return this.conversationRepo.save(conversation);
  }

  // Get conversation by ID (with access control)
  async getConversationById(
    conversationId: number,
    userId: number | null,
    isAgent: boolean = false,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['customer', 'agent', 'messages', 'messages.sender', 'messages.attachments'],
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Access control: customer can only see their own, agent can see any
    if (!isAgent) {
      if (conversation.customerId !== userId && conversation.customerId !== null) {
        throw new ForbiddenException('Access denied');
      }
      // Guest conversations: check by guest email or allow if no customerId
      if (conversation.customerId === null && userId !== null) {
        throw new ForbiddenException('Access denied');
      }
    }

    return conversation;
  }

  // Get all conversations for a customer
  async getCustomerConversations(userId: number | null): Promise<Conversation[]> {
    if (userId === null) {
      // For guests, we'd need to track by session/cookie - simplified for now
      return [];
    }

    return this.conversationRepo.find({
      where: { customerId: userId },
      relations: ['agent'],
      order: { updatedAt: 'DESC' },
    });
  }

  // Get open conversations (for agents - queue)
  async getOpenConversations(): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { status: 'open' },
      relations: ['customer'],
      order: { createdAt: 'ASC' },
    });
  }

  // Get agent's claimed conversations
  async getAgentConversations(agentId: number): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { agentId, status: In(['claimed', 'open']) },
      relations: ['customer'],
      order: { updatedAt: 'DESC' },
    });
  }

  // Claim a conversation (agent assigns it to themselves)
  async claimConversation(
    conversationId: number,
    agentId: number,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.status !== 'open') {
      throw new BadRequestException('Conversation is not available to claim');
    }

    conversation.agentId = agentId;
    conversation.status = 'claimed';

    return this.conversationRepo.save(conversation);
  }

  // Send a message in a conversation
  async sendMessage(
    conversationId: number,
    senderId: number | null,
    senderType: 'customer' | 'agent' | 'guest',
    dto: SendMessageDto,
  ): Promise<Message> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Validate sender
    if (senderType === 'customer' && conversation.customerId !== senderId) {
      throw new ForbiddenException('You are not the customer of this conversation');
    }
    // For agents: if conversation is claimed, only the assigned agent can send messages
    // If conversation is open (unclaimed), any agent can send (and it will auto-claim)
    if (senderType === 'agent') {
      if (conversation.agentId && conversation.agentId !== senderId) {
        throw new ForbiddenException('You are not the agent of this conversation');
      }
      // If conversation is open and agentId is null, auto-claim it
      if (!conversation.agentId && conversation.status === 'open') {
        conversation.agentId = senderId;
        conversation.status = 'claimed';
        await this.conversationRepo.save(conversation);
      }
    }

    const message = this.messageRepo.create({
      conversationId,
      senderId: senderId || null,
      senderType,
      content: dto.content,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation updatedAt timestamp
    conversation.updatedAt = new Date();
    await this.conversationRepo.save(conversation);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'attachments'],
    });

    if (!fullMessage) {
      throw new NotFoundException('Message not found after creation');
    }

    // Send WhatsApp notification to agent if message is from customer/guest
    if (senderType === 'customer' || senderType === 'guest') {
      // Get conversation with customer info for WhatsApp notification
      const conversationWithCustomer = await this.conversationRepo.findOne({
        where: { id: conversationId },
        relations: ['customer'],
      });

      const customerName =
        conversationWithCustomer?.customer?.name ||
        conversationWithCustomer?.guestName ||
        conversationWithCustomer?.customer?.email ||
        conversationWithCustomer?.guestEmail ||
        'Customer';

      // Send WhatsApp notification asynchronously (don't block the response)
      this.whatsappService
        .notifyAgent(conversationId, customerName, dto.content)
        .catch((error) => {
          // Log error but don't throw - WhatsApp failure shouldn't break message sending
          console.error('Failed to send WhatsApp notification:', error);
        });
    }

    return fullMessage;
  }

  // Get customer context (orders, wishlist, etc.) for agents
  async getCustomerContext(customerId: number) {
    const [orders, wishlist] = await Promise.all([
      this.orderRepo.find({
        where: { user: { id: customerId } },
        relations: ['details', 'details.product'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.wishlistRepo.find({
        where: { userId: customerId },
        relations: ['product'],
      }),
    ]);

    const user = await this.usersService.findById(customerId);

    return {
      customer: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            homeAddress: user.homeAddress,
          }
        : null,
      recentOrders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        items: order.details?.map((d) => ({
          productName: d.product?.name,
          quantity: d.quantity,
        })),
      })),
      wishlist: wishlist.map((item) => ({
        productId: item.productId,
        productName: item.product?.name,
      })),
    };
  }

  // Close a conversation
  async closeConversation(
    conversationId: number,
    agentId: number,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.agentId !== agentId) {
      throw new ForbiddenException('Only the assigned agent can close this conversation');
    }

    conversation.status = 'closed';
    return this.conversationRepo.save(conversation);
  }
}

