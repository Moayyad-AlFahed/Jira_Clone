import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/cache/redis/redis.service';
import { NewUserDto } from '../auth/dto/newUser.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/http/pagination';
import { PaginatedUserResponseDto } from './dto/user-response.dto';
import { activeUserWhere } from '../../common/prisma/soft-delete.where';
import {
  restoreUser,
  softDeleteUser,
} from '../../common/prisma/soft-delete.operations';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  withDetails = { projects: true, tasks: true };

  async findActiveByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, ...activeUserWhere },
    });
  }

  /** @deprecated Use findActiveByEmail — kept for call-site clarity during migration. */
  async findByEmail(email: string) {
    return this.findActiveByEmail(email);
  }

  async findActiveByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username, ...activeUserWhere },
      include: this.withDetails,
    });
  }

  async findByUsername(username: string) {
    return this.findActiveByUsername(username);
  }

  async findActiveById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, ...activeUserWhere },
      include: this.withDetails,
    });
  }

  async findById(id: number) {
    return this.findActiveById(id);
  }

  async findByEmailIncludingDeleted(email: string) {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async create(data: NewUserDto) {
    return this.prisma.user.create({
      data,
    });
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedUserResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...activeUserWhere,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(users, page, limit, total);
  }

  async softDeleteMe(userId: number): Promise<{ message: string }> {
    const user = await this.findActiveById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await softDeleteUser(this.prisma, userId);
    await this.revokeRefreshTokensForUser(userId);

    return { message: 'User account deleted successfully' };
  }

  async restoreWithCredentials(dto: LoginDto) {
    const user = await this.findByEmailIncludingDeleted(dto.email);
    const deletedAt = (user as { deletedAt?: Date | null } | null)?.deletedAt;
    if (!user || !deletedAt) {
      throw new UnauthorizedException('Invalid credentials or account is active');
    }

    const passwordCorrect = await bcrypt.compare(dto.password, user.hashPassword);
    if (!passwordCorrect) {
      throw new UnauthorizedException('Invalid credentials or account is active');
    }

    await restoreUser(this.prisma, user.id);

    const { hashPassword: _, ...safeUser } = user;
    return {
      message: 'User account restored successfully',
      user: {
        id: safeUser.id,
        username: safeUser.username,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        createdAt: safeUser.createdAt,
      },
    };
  }

  async restoreById(targetUserId: number, currentUserId: number) {
    if (targetUserId !== currentUserId) {
      throw new BadRequestException(
        'Restoring another user requires admin privileges (not implemented)',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: { not: null },
      } as Prisma.UserWhereInput,
    });

    if (!user) {
      throw new NotFoundException('Deleted user not found');
    }

    await restoreUser(this.prisma, targetUserId);

    const { hashPassword: _, ...safeUser } = user;
    return {
      message: 'User account restored successfully',
      user: {
        id: safeUser.id,
        username: safeUser.username,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        createdAt: safeUser.createdAt,
      },
    };
  }

  private async revokeRefreshTokensForUser(userId: number): Promise<void> {
    await this.redisService.deleteByPattern(`auth:refresh:${userId}:*`);
  }
}
