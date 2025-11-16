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
import { Cart } from '../cart/cart.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.orders, { eager: true })
  user: User;

  @ManyToOne(() => Cart, { nullable: true, eager: true })
  cart: Cart;

  @OneToMany(() => OrderDetail, detail => detail.order, { cascade: true })
  items: OrderDetail[];

  @OneToMany(() => Order, order => order.user)
  orders: Order[];


  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
