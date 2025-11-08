import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid') // <--- benzersiz otomatik ID
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  subcategory?: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  stock: number;

  @Column()
  imageUrl: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true })
  size?: string;
}
