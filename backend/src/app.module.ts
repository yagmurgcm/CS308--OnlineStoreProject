import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { getDatabaseConfig } from './config/database.config';
import { ProductModule } from './product/product.module';
import { UsersModule } from './users/users.module';
import { OrderModule } from './order/order.module';   // <-- BUNU EKLEMELİSİN 
import { ReviewsModule } from './reviews/reviews.module';


@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => getDatabaseConfig(),

      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Failed to initialize database: TypeORM options are missing');
        }
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),

    ProductModule,
    CartModule,
    UsersModule,
    AuthModule,
    OrderModule,  // <-- BURASI ARTIK DOĞRU
    ReviewsModule, // 👈 BURAYA VİRGÜL KOYUP EKLE
  ],
})
export class AppModule {}
