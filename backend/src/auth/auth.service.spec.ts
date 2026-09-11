import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const config = {
    getOrThrow: (key: string) => {
      const values: Record<string, string> = {
        AUTH_USERNAME: 'admin',
        AUTH_PASSWORD: 'secret',
      };
      const value = values[key];
      if (!value) {
        throw new Error(`Missing ${key}`);
      }
      return value;
    },
  } as ConfigService;

  const sign = jest.fn().mockReturnValue('signed-token');
  const jwt = { sign } as unknown as JwtService;

  const service = new AuthService(config, jwt);

  it('returns an access token for valid credentials', () => {
    const result = service.login({ username: 'admin', password: 'secret' });
    expect(result.accessToken).toBe('signed-token');
    expect(sign).toHaveBeenCalledWith({ sub: 'admin' });
  });

  it('rejects invalid credentials', () => {
    expect(() => service.login({ username: 'admin', password: 'wrong' })).toThrow(
      UnauthorizedException,
    );
  });
});
