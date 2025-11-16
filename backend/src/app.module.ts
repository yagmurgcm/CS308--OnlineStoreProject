import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { getDatabaseConfig } from './config/database.config';
import { ProductModule } from './product/product.module';
import { UsersModule } from './users/users.module';

// Database connection configuration using TypeORM

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),

      //Custom DataSource initialization for better control over connection
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error(
            'Failed to initialize database: TypeORM options are missing',
          );
        }
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),

    // Importing the Product module (which contains all product CRUD logic)
    ProductModule,
    CartModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
