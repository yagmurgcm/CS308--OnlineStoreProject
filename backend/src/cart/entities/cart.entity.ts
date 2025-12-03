import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CartItem } from './cart-item.entity';
import { User } from '../../users/user.entity';

@Entity('cart')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userId', type: 'int', nullable: true })
  @Index() // performans için userId index
  userId: number | null;

  @Column({
    name: 'guestToken',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  @Index()
  guestToken: string | null;

  @ManyToOne(() => User, (user) => user.cart, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: true,
    eager: true, // sepeti getirince item'lar otomatik gelir
  })
  items: CartItem[];
}
