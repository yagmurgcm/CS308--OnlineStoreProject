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
  isGuest?: boolean;
  guestSession?: string;
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

      // Check for guest session
      const guestSession =
        client.handshake.auth?.guestSession ||
        client.handshake.query?.guestSession?.toString();

      if (token) {
        // Authenticated user
        try {
          const payload = this.jwtService.verify(token);
          client.userId = payload.sub;
          client.role = payload.role;
          client.isGuest = false;

          // Track user socket
          if (client.userId) {
            if (!this.userSockets.has(client.userId)) {
              this.userSockets.set(client.userId, new Set());
            }
            this.userSockets.get(client.userId)!.add(client.id);
          }

          console.log(`Authenticated client connected: ${client.id}, userId: ${client.userId}`);
        } catch (error) {
          console.error('JWT verification failed:', error);
          // Don't disconnect - allow as guest
          client.isGuest = true;
          client.guestSession = guestSession || `guest-${Date.now()}`;
          console.log(`Guest client connected (invalid token): ${client.id}, session: ${client.guestSession}`);
        }
      } else if (guestSession) {
        // Guest user with session
        client.isGuest = true;
        client.guestSession = guestSession;
        console.log(`Guest client connected: ${client.id}, session: ${guestSession}`);
      } else {
        // Anonymous guest - generate session
        client.isGuest = true;
        client.guestSession = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Anonymous guest client connected: ${client.id}, session: ${client.guestSession}`);
      }
    } catch (error) {
      console.error('WebSocket connection error:', error);
      // Still allow connection as guest
      client.isGuest = true;
      client.guestSession = `guest-${Date.now()}`;
      console.log(`Guest client connected (error fallback): ${client.id}`);
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
    // Allow both authenticated users and guests to join conversations
    try {
      // For guests, we skip the access control check since they may have started the conversation
      if (!client.isGuest && client.userId) {
        // Verify user has access to this conversation
        await this.supportService.getConversationById(
          data.conversationId,
          client.userId,
          client.role === 'SUPPORT_AGENT',
        );
      }

      client.join(`conversation:${data.conversationId}`);
      this.socketConversations.set(client.id, data.conversationId);
      client.conversationId = data.conversationId;

      console.log(`Client ${client.id} joined conversation ${data.conversationId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to join conversation:', error);
      return { error: 'Failed to join conversation' };
    }
  }

  @SubscribeMessage('send-message')
  @UsePipes(new ValidationPipe())
  async handleSendMessage(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() dto: SendMessageDto & { conversationId: number },
  ) {
    const conversationId = dto.conversationId;
    const role = client.role;

    let senderType: 'customer' | 'agent' | 'guest';
    let senderId: number | null = null;

    if (role === 'SUPPORT_AGENT') {
      senderType = 'agent';
      senderId = client.userId || null;
    } else if (client.userId && !client.isGuest) {
      senderType = 'customer';
      senderId = client.userId;
    } else {
      senderType = 'guest';
      senderId = null;
    }

    try {
      // Save message to database
      const message = await this.supportService.sendMessage(
        conversationId,
        senderId,
        senderType,
        { content: dto.content },
      );

      // Broadcast message to all in the conversation room
      this.notifyNewMessage(message);

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
