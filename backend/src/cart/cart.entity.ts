import { Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, Unique } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { User } from '../users/user.entity';

@Entity()
@Unique(['user'])
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItem[];
}

