import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { OrderDetail } from './order-detail.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  shippingCity: string;

  @Column({ nullable: true })
  shippingPostalCode: string;

  @Column({ nullable: true })
  shippingCountry: string;

  @Column({ nullable: true })
  paymentBrand: string;

  @Column({ nullable: true })
  paymentLast4: string;

  @Column()
  userId: number;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => OrderDetail, (detail) => detail.order, { cascade: true })
  details: OrderDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
