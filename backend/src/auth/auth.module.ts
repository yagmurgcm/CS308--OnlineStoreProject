import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthToken } from './auth-token.entity';

// Groups all auth components (controller, service, jwt)
//  To bring together, to arrange, to organise.
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_jwt_secret',
      signOptions: {
        expiresIn: Number(process.env.JWT_EXPIRES_IN) || 60 * 60 * 24, // seconds
      },
    }),
    TypeOrmModule.forFeature([AuthToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
