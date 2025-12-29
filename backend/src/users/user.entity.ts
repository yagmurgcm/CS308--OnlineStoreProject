import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { Cart } from '../cart/entities/cart.entity';
import { Order } from '../order/order.entity';
import { Review } from '../reviews/review.entity'; // 👈 1. IMPORTU EKLE

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column('varchar', { length: 64, nullable: true })
  taxId: string | null;

  @Column('varchar', { length: 255, nullable: true })
  homeAddress: string | null;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 50, default: 'customer' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToOne(() => Cart, (cart) => cart.user)
  cart: Cart[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];
}
