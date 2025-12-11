import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      this.handleRequest(null, payload, null, context);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  handleRequest(
    err: unknown,
    user: unknown,
    info: unknown,
    _context: ExecutionContext,
  ) {
    if (err) {
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException(
        (info as Error)?.message ?? 'Unauthorized request',
      );
    }
    return user;
  }

  private extractToken(request: any): string | null {
    const header: string | undefined = request.headers?.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7).trim();
    }
    if (typeof request.cookies?.token === 'string') {
      return request.cookies.token;
    }
    return null;
  }
}
