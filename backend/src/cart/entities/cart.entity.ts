import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  Unique
} from 'typeorm';
import { CartItem } from './cart-item.entity';
import { User } from '../../users/user.entity';

@Entity('cart')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index() // performans için userId index
  userId: number;

  // User ile ilişki (çok gelişmiş projelerde çok önemli)
  @ManyToOne(() => User, (user) => user.cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Sepetteki ürünler
  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: true,
    eager: true, // sepeti getirince item'lar otomatik gelir
  })
  items: CartItem[];


}
