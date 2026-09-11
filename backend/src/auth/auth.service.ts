import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  login(dto: LoginDto): LoginResponseDto {
    const expectedUsername = this.config.getOrThrow<string>('AUTH_USERNAME');
    const expectedPassword = this.config.getOrThrow<string>('AUTH_PASSWORD');

    const usernameOk = this.secureCompare(dto.username, expectedUsername);
    const passwordOk = this.secureCompare(dto.password, expectedPassword);

    if (!usernameOk || !passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwt.sign({ sub: expectedUsername });
    return { accessToken };
  }

  /** Constant-time string compare via hashes to avoid length leaks. */
  private secureCompare(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest();
    const hb = createHash('sha256').update(b).digest();
    return timingSafeEqual(ha, hb);
  }
}
