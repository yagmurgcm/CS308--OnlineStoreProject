import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Product } from './product/product.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';

// Database connection configuration using TypeORM

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '1234',
        database: 'onlinestore',
        entities: [Product, User],
        synchronize: true,
        logging: true,
      }),

      //Custom DataSource initialization for better control over connection
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options!);
        return dataSource.initialize();
      },
    }),

    // Importing the Product module (which contains all product CRUD logic)
    ProductModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
