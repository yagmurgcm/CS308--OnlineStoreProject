import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { getDatabaseConfig } from './config/database.config';
import { ProductModule } from './product/product.module';
import { UsersModule } from './users/users.module';
import { OrderModule } from './order/order.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const baseConfig = getDatabaseConfig();
        console.log('DEBUG >>> TypeORM synchronize enabled for orders table fix');
        return {
          ...baseConfig,
          synchronize: false,
          logging: true,
        };
      },

      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error(
            'Failed to initialize database: TypeORM options are missing',
          );
        }
        const dataSource = new DataSource(options);
        const initialized = await dataSource.initialize();
        console.log('DEBUG >>> TypeORM DataSource initialized with sync:', options?.synchronize);
        return initialized;
      },
    }),

    ProductModule,
    CartModule,
    UsersModule,
    AuthModule,
    OrderModule, // <-- BURASI ARTIK DOĞRU
    ReviewsModule, // 👈 BURAYA VİRGÜL KOYUP EKLE
  ],
})
export class AppModule {}
