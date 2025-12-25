import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Conversation } from './conversation.entity';
import { ChatAttachment } from './chat-attachment.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  // Sender (nullable for guest messages)
  @Column({ type: 'int', nullable: true })
  senderId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User | null;

  // Sender type: 'customer', 'agent', 'guest'
  @Column({ type: 'varchar', length: 20 })
  senderType: string;

  // Message content
  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ChatAttachment, (attachment) => attachment.message, {
    cascade: true,
  })
  attachments: ChatAttachment[];
}

