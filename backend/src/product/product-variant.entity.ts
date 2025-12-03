import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Product } from './entities/product.entity'; // Import yolunu projene göre kontrol et

@Entity({ name: 'product_variants' })
@Unique(['product', 'color', 'size']) // Aynı ürünün aynı renk ve bedeni 2 kere eklenmesin diye koruma
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE', // Ürün silinirse varyantları da silinsin
    eager: true, // 🔥 Sepete eklerken product bilgisi de gelsin
  })
  @JoinColumn({ name: 'productId' }) // Veritabanında productId adında sütun oluşturur
  product: Product;

  @Column({ length: 60 })
  color: string;

  @Column({ length: 30 })
  size: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  stock: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
