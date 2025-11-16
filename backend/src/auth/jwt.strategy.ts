import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

type JwtFromRequestFunction = (req: Request) => string | null;

// Validates JWT token from Authorization header
//  verifies the token and recognizes the user.

const bearerTokenExtractor: JwtFromRequestFunction = (request: Request) => {
  const authHeader = request?.headers?.authorization;
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // Passport's Strategy constructor lacks strict typings; ignore lint warning for this call.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      jwtFromRequest: bearerTokenExtractor,
      secretOrKey: process.env.JWT_SECRET || 'dev_jwt_secret',
    });
  }

  validate(payload: { sub: number; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
