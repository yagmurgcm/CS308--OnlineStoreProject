import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductVariant } from '../product-variant.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];
}
