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


// Auth logic: hash password, validate user, return JWT
//Functions that perform the main operations related to the user are defined

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

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
    });
    const token = await this.signToken(user.id, user.email);
    try {
      await this.tokenRepo.save({ userId: user.id, token });
    } catch (e) {
      // Token kaydı başarısız olursa signup'ı engellemeyelim
    }
    return { access_token: token };
  }

  async signin(dto: SignInDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const token = await this.signToken(user.id, user.email);
    try {
      await this.tokenRepo.save({ userId: user.id, token });
    } catch (e) {
      // Token kaydı başarısız olursa girişe engel olmayalım
    }
    await this.loginLogRepo.save({
      userId: user.id,
      email: user.email,
    });
    return { message: 'login successful', access_token: token };
  }

  private async signToken(userId: number, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.signAsync(payload);
  }
}

