import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
// Dosya yoluna dikkat: Eğer product-variant aynı klasördeyse ./ kullan
// Üst klasördeyse ../ kullan. Senin koduna göre ../ olarak bıraktım.
import { ProductVariant } from '../product-variant.entity'; 
import { Review } from '../../reviews/review.entity'; // 👈 1. BU IMPORTU EKLE
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  subcategory: string;

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

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @Column("decimal", { precision: 3, scale: 1, default: 0 }) 
  averageRating: number; // Örn: 4.5

  @Column("int", { default: 0 })
  reviewCount: number;   // Örn: 12
}