import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('chat_attachments')
export class ChatAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  messageId: number;

  @ManyToOne(() => Message, (message) => message.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  // File information
  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'varchar', length: 100 })
  fileType: string; // MIME type: application/pdf, image/jpeg, video/mp4, etc.

  @Column({ type: 'int' })
  fileSize: number; // Size in bytes

  @CreateDateColumn()
  createdAt: Date;
}

