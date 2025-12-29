import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  // Customer (nullable - guest conversations allowed)
  @Column({ type: 'int', nullable: true })
  customerId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: User | null;

  // Assigned support agent
  @Column({ type: 'int', nullable: true })
  agentId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: User | null;

  // Status: 'open' (unclaimed), 'claimed' (agent assigned), 'closed'
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: string;

  // Guest information (if not logged in)
  @Column({ type: 'varchar', length: 255, nullable: true })
  guestEmail: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  guestName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}

