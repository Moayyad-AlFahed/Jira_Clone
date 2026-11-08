import type { Prisma } from 'src/generated/prisma/client';
import type { PrismaService } from 'src/prisma/prisma.service';

export type SoftDeleteDbClient = Pick<
  PrismaService,
  'baseEntity' | 'user' | 'sprint' | 'task'
>;

export async function softDeleteBaseEntity(
  client: SoftDeleteDbClient,
  baseEntityId: number,
  deletedById?: number,
): Promise<void> {
  await client.baseEntity.update({
    where: { id: baseEntityId },
    data: {
      deletedAt: new Date(),
      ...(deletedById !== undefined ? { deletedById } : {}),
    } as Prisma.BaseEntityUpdateInput,
  });
}

export async function restoreBaseEntity(
  client: SoftDeleteDbClient,
  baseEntityId: number,
): Promise<void> {
  await client.baseEntity.update({
    where: { id: baseEntityId },
    data: {
      deletedAt: null,
      deletedById: null,
    } as Prisma.BaseEntityUpdateInput,
  });
}

export async function softDeleteManyBaseEntities(
  client: SoftDeleteDbClient,
  baseEntityIds: number[],
  deletedById?: number,
): Promise<void> {
  if (baseEntityIds.length === 0) {
    return;
  }

  await client.baseEntity.updateMany({
    where: { id: { in: baseEntityIds } },
    data: {
      deletedAt: new Date(),
      ...(deletedById !== undefined ? { deletedById } : {}),
    } as Prisma.BaseEntityUpdateManyMutationInput,
  });
}

export async function restoreManyBaseEntities(
  client: SoftDeleteDbClient,
  baseEntityIds: number[],
): Promise<void> {
  if (baseEntityIds.length === 0) {
    return;
  }

  await client.baseEntity.updateMany({
    where: { id: { in: baseEntityIds } },
    data: {
      deletedAt: null,
      deletedById: null,
    } as Prisma.BaseEntityUpdateManyMutationInput,
  });
}

export async function softDeleteUser(
  client: SoftDeleteDbClient,
  userId: number,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() } as Prisma.UserUpdateInput,
  });
}

export async function restoreUser(
  client: SoftDeleteDbClient,
  userId: number,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { deletedAt: null } as Prisma.UserUpdateInput,
  });
}

/** Collect BaseEntity ids for all sprints and tasks under a project (for cascade soft delete/restore). */
export async function collectProjectChildBaseEntityIds(
  client: SoftDeleteDbClient,
  projectId: number,
): Promise<number[]> {
  const [sprints, tasks] = await Promise.all([
    client.sprint.findMany({
      where: { projectId },
      select: { baseEntityId: true },
    }),
    client.task.findMany({
      where: { projectId },
      select: { baseEntityId: true },
    }),
  ]);

  return [...sprints.map((s) => s.baseEntityId), ...tasks.map((t) => t.baseEntityId)];
}
