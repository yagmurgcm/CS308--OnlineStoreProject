import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../product/product-variant.entity';

@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  // Eğer veritabanında bu da alt tireliyse 'cart_id' yapman gerekebilir.
  // Ama şimdilik variant'a odaklanalım, cart çalışıyorsa elleme.
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @ManyToOne(() => ProductVariant, { eager: true, onDelete: 'CASCADE' })
  // 🔥 DÜZELTME BURADA YAPILDI:
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;
}
