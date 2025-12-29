import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { ReturnRequest } from './return-request.entity';
import { OrderDetail } from './order-detail.entity';

@Entity()
export class ReturnRequestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  requestId: number;

  @ManyToOne(() => ReturnRequest, (request) => request.items)
  @JoinColumn({ name: 'requestId' })
  request: ReturnRequest;

  @Column()
  orderDetailId: number;

  @ManyToOne(() => OrderDetail, { eager: true })
  @JoinColumn({ name: 'orderDetailId' })
  orderDetail: OrderDetail;

  @Column({ type: 'int' })
  quantity: number;
}
