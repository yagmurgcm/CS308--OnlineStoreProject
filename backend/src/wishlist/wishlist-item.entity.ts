import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  JoinColumn,
  } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../product/entities/product.entity';

@Entity('wishlist_items')
@Unique(['userId', 'productId'])
export class WishlistItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int' })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
