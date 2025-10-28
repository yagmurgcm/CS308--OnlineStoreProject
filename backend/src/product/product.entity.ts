import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';


// Product Table
@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number; // id

    @Column()
    name: string; // product name

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;  // price

    @Column({ nullable: true })
    description: string;  // description

    @Column({ nullable: true })
    imageUrl: string;  // image of product
}
