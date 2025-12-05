import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { OrderDetail } from './order-detail.entity';
import { Cart } from '../cart/entities/cart.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.orders, { eager: true })
  user: User;

  @ManyToOne(() => Cart, { nullable: true, eager: true })
  cart: Cart;

  @OneToMany(() => OrderDetail, (detail) => detail.order, { cascade: false })
  details: OrderDetail[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true, length: 120 })
  contactName?: string;

  @Column({ nullable: true, length: 255 })
  contactEmail?: string;

  @Column({ nullable: true, length: 30 })
  contactPhone?: string;

  @Column({ nullable: true, length: 255 })
  shippingAddress?: string;

  @Column({ nullable: true, length: 120 })
  shippingCity?: string;

  @Column({ nullable: true, length: 20 })
  shippingPostalCode?: string;

  @Column({ nullable: true, length: 120 })
  shippingCountry?: string;

  @Column({ nullable: true, length: 20 })
  paymentBrand?: string;

  @Column({ nullable: true, length: 8 })
  paymentLast4?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
