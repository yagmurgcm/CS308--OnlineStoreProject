import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Product } from './product/entities/product.entity';

const testConnection = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '1234', // MySQL kurarken verdiğin şifre
  database: 'onlinestore', // buraya onlinestore yazın (ben kendimde projectstore diye yapmışım siz yapmayın)
  entities: [Product],
  synchronize: true, // tabloyu oluşturmayı denesin
});

async function main() {
  try {
    await testConnection.initialize();
    console.log('✅ Database connected successfully!');
    await testConnection.destroy();
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

main();
