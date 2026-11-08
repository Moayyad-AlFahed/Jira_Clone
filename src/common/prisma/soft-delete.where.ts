import type { Prisma } from 'src/generated/prisma/client';

/** Active (not soft-deleted) BaseEntity filter for nested `where.baseEntity`. */
export const activeBaseEntityWhere = {
  deletedAt: null,
} as Prisma.BaseEntityWhereInput;

/** Active (not soft-deleted) User filter for top-level user queries. */
export const activeUserWhere = {
  deletedAt: null,
} as Prisma.UserWhereInput;
