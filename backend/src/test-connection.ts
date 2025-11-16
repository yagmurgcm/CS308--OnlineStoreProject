import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Product } from './product/product.entity';
import { ProductVariant } from './product/product-variant.entity';

const testConnection = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'gucluParola741741.', // MySQL kurarken verdigin sifre
  database: 'onlinestore',
  entities: [Product, ProductVariant],
  synchronize: true, // tabloyu olusturmayi denesin
});

async function main() {
  try {
    await testConnection.initialize();
    console.log('Database connected successfully!');
    await testConnection.destroy();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

void main();
