import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { TokenService } from './token/token.service';
import { RedisService } from 'src/cache/redis/redis.service';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from './dto/refreshToken.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.userService.findByEmail(dto.email);
    if (existingEmail)
      throw new ConflictException('Email is already registered');

    const existingUsername = await this.userService.findByUsername(
      dto.username,
    );
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userService.create({
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      hashPassword,
    });

    const { hashPassword: _, ...safeUser } = user;
    const token = await this.tokenService.generateAccessToken(safeUser);
    return {
      safeUser,
      token,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordCorrect = await bcrypt.compare(password, user.hashPassword);
    if (!passwordCorrect)
      throw new UnauthorizedException('Invalid credentials');

    const { hashPassword: _, ...safUser } = user;

    return safUser;
  }

  async login(user: { id: number; email: string; username: string }) {
    const tokens = this.tokenService.generateTokens(user);

    const redisKey = this.getRefreshTokenKey(user.id, tokens.refreshTokenJti);

    const refreshTokenHash = this.hashToken(tokens.refreshToken);

    const refreshTokenTtl = 7 * 24 * 60 * 60;

    await this.redisService.set(redisKey, refreshTokenHash, refreshTokenTtl);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }


  async refresh(refreshToken: string) {
  let payload;

  try {
    payload = this.tokenService.verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new UnauthorizedException('Invalid refresh token');
  }

  const redisKey = this.getRefreshTokenKey(
    payload.sub,
    payload.jti,
  );

  const storedRefreshTokenHash =
    await this.redisService.get(redisKey);

  if (!storedRefreshTokenHash) {
    throw new UnauthorizedException(
      'Refresh token is expired or revoked',
    );
  }

  const receivedRefreshTokenHash = this.hashToken(refreshToken);

  if (receivedRefreshTokenHash !== storedRefreshTokenHash) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  const user = await this.userService.findById(payload.sub);

  if (!user) {
    throw new UnauthorizedException('User no longer exists');
  }

  // Revoke the old refresh token before issuing a new one.
  await this.redisService.delete(redisKey);

  const newTokens = this.tokenService.generateTokens({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  const newRedisKey = this.getRefreshTokenKey(
    user.id,
    newTokens.refreshTokenJti,
  );

  const newRefreshTokenHash = this.hashToken(
    newTokens.refreshToken,
  );

  const refreshTokenTtl = 7 * 24 * 60 * 60;

  await this.redisService.set(
    newRedisKey,
    newRefreshTokenHash,
    refreshTokenTtl,
  );

  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  };
}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenKey(userId: number, jti: string): string {
    return `auth:refresh:${userId}:${jti}`;
  }
}
