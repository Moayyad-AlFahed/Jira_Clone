import type { PrismaService } from 'src/prisma/prisma.service';

/** Active user row for auth and listings (excludes soft-deleted accounts). */
export type ActiveUserRecord = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  hashPassword: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function findActiveUserByEmail(
  prisma: PrismaService,
  email: string,
): Promise<ActiveUserRecord | null> {
  const rows = await prisma.$queryRaw<ActiveUserRecord[]>`
    SELECT
      id,
      username,
      email,
      "firstName",
      "lastName",
      "hashPassword",
      "createdAt",
      "updatedAt"
    FROM "User"
    WHERE email = ${email} AND "deletedAt" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findActiveUserById(
  prisma: PrismaService,
  id: number,
): Promise<ActiveUserRecord | null> {
  const rows = await prisma.$queryRaw<ActiveUserRecord[]>`
    SELECT
      id,
      username,
      email,
      "firstName",
      "lastName",
      "hashPassword",
      "createdAt",
      "updatedAt"
    FROM "User"
    WHERE id = ${id} AND "deletedAt" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findActiveUserByUsername(
  prisma: PrismaService,
  username: string,
): Promise<ActiveUserRecord | null> {
  const rows = await prisma.$queryRaw<ActiveUserRecord[]>`
    SELECT
      id,
      username,
      email,
      "firstName",
      "lastName",
      "hashPassword",
      "createdAt",
      "updatedAt"
    FROM "User"
    WHERE username = ${username} AND "deletedAt" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}
