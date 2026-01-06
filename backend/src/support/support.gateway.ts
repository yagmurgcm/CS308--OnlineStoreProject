import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SupportService } from './support.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getCorsOptions } from '../config/cors.config';

interface SocketWithUser extends Socket {
  userId?: number;
  role?: string;
  conversationId?: number;
}

@WebSocketGateway({
  cors: getCorsOptions(),
  namespace: '/support',
})
export class SupportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds
  private socketConversations = new Map<string, number>(); // socketId -> conversationId

  constructor(
    private readonly supportService: SupportService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: SocketWithUser) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.role = payload.role;

      // Track user socket
      if (client.userId) {
        if (!this.userSockets.has(client.userId)) {
          this.userSockets.set(client.userId, new Set());
        }
        this.userSockets.get(client.userId)!.add(client.id);
      }

      console.log(`Client connected: ${client.id}, userId: ${client.userId}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }

    const conversationId = this.socketConversations.get(client.id);
    if (conversationId) {
      this.socketConversations.delete(client.id);
      client.leave(`conversation:${conversationId}`);
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { conversationId: number },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Verify user has access to this conversation
      const conversation = await this.supportService.getConversationById(
        data.conversationId,
        client.userId,
        client.role === 'SUPPORT_AGENT',
      );

      client.join(`conversation:${data.conversationId}`);
      this.socketConversations.set(client.id, data.conversationId);
      client.conversationId = data.conversationId;

      return { success: true };
    } catch (error) {
      return { error: 'Failed to join conversation' };
    }
  }

  @SubscribeMessage('send-message')
  @UsePipes(new ValidationPipe())
  async handleSendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: SendMessageDto & { conversationId: number },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const conversationId = dto.conversationId;
    const role = client.role;

    let senderType: 'customer' | 'agent' | 'guest';
    if (role === 'SUPPORT_AGENT') {
      senderType = 'agent';
    } else if (client.userId) {
      senderType = 'customer';
    } else {
      senderType = 'guest';
    }

    try {
      // Save message to database
      const message = await this.supportService.sendMessage(
        conversationId,
        client.userId,
        senderType,
        { content: dto.content },
      );

      // Already handled by controller calling notifyNewMessage
      return { success: true, message };
    } catch (error) {
      console.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }
  }

  // Notify all agents about new conversation
  notifyNewConversation(conversationId: number) {
    this.server.emit('new-conversation', { conversationId });
  }

  // Notify conversation participants about status change
  notifyConversationStatusChange(conversationId: number, status: string) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation-status-changed', { conversationId, status });
  }

  // Notify agents about conversation update
  notifyConversationUpdate(conversationId: number) {
    this.server.emit('conversation-updated', { conversationId });
  }

  // Notify new message to conversation participants
  notifyNewMessage(message: any) {
    this.server
      .to(`conversation:${message.conversationId}`)
      .emit('new-message', message);
  }
}
