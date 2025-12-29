import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { WhatsAppService } from './whatsapp.service';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ChatAttachment } from './chat-attachment.entity';
import { UsersModule } from '../users/users.module';
import { Order } from '../order/order.entity';
import { WishlistItem } from '../wishlist/wishlist-item.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      ChatAttachment,
      Order,
      WishlistItem,
    ]),
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_jwt_secret',
      signOptions: {
        expiresIn: Number(process.env.JWT_EXPIRES_IN) || 60 * 60 * 24,
      },
    }),
  ],
  controllers: [SupportController],
  providers: [SupportService, SupportGateway, WhatsAppService],
  exports: [SupportService, SupportGateway],
})
export class SupportModule {}

