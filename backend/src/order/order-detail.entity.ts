import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

import { Order } from './order.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariant } from '../product/product-variant.entity';

@Entity()
export class OrderDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @ManyToOne(() => Order, (order) => order.details)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ nullable: true })
  productId: number | null;

  @ManyToOne(() => Product, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ nullable: true })
  variantId: number | null;

  @ManyToOne(() => ProductVariant, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant | null;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lineTotal: number;

  @Column({ type: 'int', default: 0 })
  returnedQuantity: number;
}
