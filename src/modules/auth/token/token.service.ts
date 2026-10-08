import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  username: string;
  type: 'access';
}
export interface RefreshTokenPayload {
  sub: number;
  email: string;
  username: string;
  type: 'refresh';
  jti: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenJti: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(user: {
    id: number;
    email: string;
    username: string;
  }): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '30m',
      ) as any,
    });
  }

  generateRefreshToken(user: { id: number; email: string; username: string }): {
    token: string;
    jti: string;
  } {
    const jti = randomUUID();

    const payload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      type: 'refresh',
      jti,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ) as any,
    });

    return {
      token,
      jti,
    };
  }

  generateTokens(user: {
    id: number;
    email: string;
    username: string;
  }): TokenPair {
    const accessToken = this.generateAccessToken(user);

    const { token: refreshToken, jti } = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      refreshTokenJti: jti,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token);
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
    } catch (error) {
      console.log(error,'error');
    }
  }

  decodeToken(token: string): AccessTokenPayload | RefreshTokenPayload | null {
    return this.jwtService.decode<AccessTokenPayload | RefreshTokenPayload>(
      token,
    );
  }
  

}
