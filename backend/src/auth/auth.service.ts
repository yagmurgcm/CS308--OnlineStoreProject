import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken } from './auth-token.entity';
import { LoginLog } from './login-log.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(AuthToken)
    private readonly tokenRepo: Repository<AuthToken>,
    @InjectRepository(LoginLog)
    private readonly loginLogRepo: Repository<LoginLog>,
  ) {}

  async signup(dto: SignUpDto) {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // UsersService.create, User entity alanlarıyla birebir eşleşmeli
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,                // <-- düzeltildi
    });

    const token = await this.signToken(user.id, user.email);
    try {
      await this.tokenRepo.save({ userId: user.id, token });
    } catch (e) {
      // token kaydı başarısızsa akışı bozma
    }
    return { access_token: token };
  }

  async signin(dto: SignInDto) {
    // Şifre hash'ini de çekmemiz lazım
    // 1) Eğer UsersService'te "findByEmailWithHash" gibi bir metod varsa onu kullan:
    // const user = await this.usersService.findByEmailWithHash(dto.email);

    // 2) Yoksa UsersService.findByEmail'i şunun gibi yazdığından emin ol:
    // findOne({ where: { email }, select: ['id','email','passwordHash','name', ...] })

    const user = await this.usersService.findByEmail(dto.email, { withHash: true });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash); // <-- düzeltildi
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken(user.id, user.email);
    try {
      await this.tokenRepo.save({ userId: user.id, token });
    } catch (e) {
      // token kaydı başarısızsa girişe engel olma
    }
    await this.loginLogRepo.save({
      userId: user.id,
      email: user.email,
      logoutTime: null,
    });
    return { message: 'login successful', access_token: token };
  }

  async logout(userId: number) {
    const latestLog = await this.loginLogRepo.findOne({
      where: { userId },
      order: { loginTime: 'DESC' },
    });

    let logoutTime: Date | null = null;

    if (latestLog) {
      logoutTime = new Date();
      latestLog.logoutTime = logoutTime;
      await this.loginLogRepo.save(latestLog);
    }

    return {
      message: 'Logout successful',
      logoutTime,
    };
  }

  private async signToken(userId: number, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.signAsync(payload);
  }
}
