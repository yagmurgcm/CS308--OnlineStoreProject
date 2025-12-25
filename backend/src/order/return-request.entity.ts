import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { User } from '../users/user.entity';
import { ReturnRequestItem } from './return-request-item.entity';

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity()
export class ReturnRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @ManyToOne(() => Order, { eager: false })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  userId: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: ReturnRequestStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  returnShippingCode: string | null;

  @OneToMany(() => ReturnRequestItem, (item) => item.request, {
    cascade: true,
  })
  items: ReturnRequestItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
