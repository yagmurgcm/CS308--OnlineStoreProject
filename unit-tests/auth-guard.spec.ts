import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { AuthGuard } from './auth.guard';

const createContext = (request: Record<string, any>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('AuthGuard', () => {
  let guard: AuthGuard;
  const jwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    guard = module.get(AuthGuard);
    jest.clearAllMocks();
  });

  it('allows request when token is valid', async () => {
    const payload = { userId: 10 };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request: any = {
      headers: { authorization: 'Bearer valid.jwt.token' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(payload);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token');
  });

  it('attaches decoded user to request object', async () => {
    const payload = { sub: 1, email: 'user@example.com' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request: any = {
      headers: { authorization: 'Bearer token-value' },
    };

    await guard.canActivate(createContext(request));

    expect(request.user).toEqual(payload);
  });

  it('denies request when token is invalid', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    const request: any = {
      headers: { authorization: 'Bearer broken' },
    };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('denies request when token is missing', async () => {
    const request: any = { headers: {} };

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('handleRequest enforces presence of user', () => {
    const request: any = { headers: { authorization: 'Bearer token' } };
    jwtService.verifyAsync.mockResolvedValue({ id: 1 });

    expect(() => guard.handleRequest(null, null, { message: 'fail' }, createContext(request))).toThrow(
      UnauthorizedException,
    );

    expect(
      guard.handleRequest(null, { id: 1 }, null, createContext(request)),
    ).toEqual({ id: 1 });
  });
});
