import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity'; // User entity yolun farklıysa düzelt
import { Product } from '../product/entities/product.entity'; // Product entity yolun farklıysa düzelt

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rating: number; // 1-5 arası puan

  @Column({ type: 'text' })
  comment: string;

  // Yorumlar onaylanmadan görünmeyecek (Feature 5 kuralı)
  @Column({ default: false })
  isApproved: boolean;

  
  @CreateDateColumn()
  createdAt: Date;

  // Hangi Kullanıcı Yazdı?
  @ManyToOne(() => User, (user) => user.reviews, { eager: true }) 
  user: User;

  @Column()
  userId: number;

  // Hangi Ürüne Yazıldı?
  @ManyToOne(() => Product, (product) => product.reviews)
  product: Product;

  @Column()
  productId: number;
}