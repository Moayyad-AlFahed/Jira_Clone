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
import {
  findActiveUserByEmail,
  findActiveUserById,
  findActiveUserByUsername,
} from '../../common/prisma/active-user.queries';
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
    return findActiveUserByEmail(this.prisma, email);
  }

  /** @deprecated Use findActiveByEmail — kept for call-site clarity during migration. */
  async findByEmail(email: string) {
    return this.findActiveByEmail(email);
  }

  async findActiveByUsername(username: string) {
    return findActiveUserByUsername(this.prisma, username);
  }

  async findByUsername(username: string) {
    return this.findActiveByUsername(username);
  }

  async findActiveById(id: number) {
    return findActiveUserById(this.prisma, id);
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
    const offset = (page - 1) * limit;
    const pattern = search ? `%${search}%` : null;

    const users = pattern
      ? await this.prisma.$queryRaw<
          {
            id: number;
            username: string;
            firstName: string;
            lastName: string;
            email: string;
            createdAt: Date;
          }[]
        >`
          SELECT id, username, "firstName", "lastName", email, "createdAt"
          FROM "User"
          WHERE "deletedAt" IS NULL
            AND (
              username ILIKE ${pattern}
              OR email ILIKE ${pattern}
              OR "firstName" ILIKE ${pattern}
              OR "lastName" ILIKE ${pattern}
            )
          ORDER BY id DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      : await this.prisma.$queryRaw<
          {
            id: number;
            username: string;
            firstName: string;
            lastName: string;
            email: string;
            createdAt: Date;
          }[]
        >`
          SELECT id, username, "firstName", "lastName", email, "createdAt"
          FROM "User"
          WHERE "deletedAt" IS NULL
          ORDER BY id DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    const countRows = pattern
      ? await this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count
          FROM "User"
          WHERE "deletedAt" IS NULL
            AND (
              username ILIKE ${pattern}
              OR email ILIKE ${pattern}
              OR "firstName" ILIKE ${pattern}
              OR "lastName" ILIKE ${pattern}
            )
        `
      : await this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint AS count
          FROM "User"
          WHERE "deletedAt" IS NULL
        `;

    const total = Number(countRows[0]?.count ?? 0);

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
