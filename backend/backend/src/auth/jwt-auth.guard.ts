import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects routes, allows only authenticated users
// for now inactive then it will be active for admins, users

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

