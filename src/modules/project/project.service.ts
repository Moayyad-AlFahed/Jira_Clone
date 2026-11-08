import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'src/generated/prisma/client';
import { ProjectRole } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignProjectUserDto } from './dto/assign-project-user.dto';
import {
  PaginatedProjectResponseDto,
  ProjectResponseDto,
} from './dto/project-response.dto';
import { ProjectMemberListItemDto } from './dto/project-member-list-item.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/http/pagination';
import { activeBaseEntityWhere } from '../../common/prisma/soft-delete.where';
import { findActiveUserById } from '../../common/prisma/active-user.queries';
import {
  collectProjectChildBaseEntityIds,
  restoreBaseEntity,
  restoreManyBaseEntities,
  softDeleteBaseEntity,
  softDeleteManyBaseEntities,
} from '../../common/prisma/soft-delete.operations';

const projectDetailsInclude = {
  baseEntity: { include: { status: true } },
  users: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  _count: { select: { sprints: true, tasks: true } },
} satisfies Prisma.ProjectInclude;

type ProjectWithDetails = Prisma.ProjectGetPayload<{
  include: typeof projectDetailsInclude;
}>;

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: number,
  ): Promise<ProjectResponseDto> {
    console.log('createProjectDto', createProjectDto);
    console.log('userId', userId);
    await this.ensureStatusExists(createProjectDto.statusId);

    const projectId = await this.prisma.$transaction(async (transaction) => {
      const baseEntity = await transaction.baseEntity.create({
        data: createProjectDto,
      });

      const project = await transaction.project.create({
        data: {
          baseEntityId: baseEntity.id,
          users: {
            create: {
              userId,
              role: ProjectRole.OWNER,
            },
          },
        },
      });

      console.log('project', project);

      return project.id;
    });

    return this.findOne(projectId, userId);
  }

  private async ensureStatusExists(statusId?: number | null) {
    if (statusId === undefined || statusId === null) {
      return;
    }

    const status = await this.prisma.status.findUnique({
      where: { id: statusId },
      select: { id: true },
    });

    if (!status) {
      throw new BadRequestException(
        `Status with id ${statusId} does not exist`,
      );
    }
  }

  async findAll(
    userId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedProjectResponseDto> {
    return this.findProjectsForUser(userId, query);
  }

  private async findProjectsForUser(
    userId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedProjectResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      users: { some: { userId } },
      baseEntity: {
        ...activeBaseEntityWhere,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectDetailsInclude,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginate(
      projects.map((project) => this.toResponse(project)),
      page,
      limit,
      total,
    );
  }

  async findOne(id: number, userId: number): Promise<ProjectResponseDto> {
    if (!(await this.ensureProjectMember(id, userId))) {
      throw new NotFoundException('Project not found');
    }

    const project = await this.prisma.project.findFirst({
      where: { id, baseEntity: activeBaseEntityWhere },
      include: projectDetailsInclude,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.toResponse(project);
  }

  async testProjectMembership(projectId: number, userId: number) {
    return { isMember: await this.ensureProjectMember(projectId, userId) };
  }

  async listMembers(
    projectId: number,
    userId: number,
  ): Promise<ProjectMemberListItemDto[]> {
    if (!(await this.ensureProjectMember(projectId, userId))) {
      throw new NotFoundException('Project not found');
    }

    const rows = await this.prisma.$queryRaw<
      {
        userId: number;
        role: ProjectRole;
        membershipCreatedAt: Date;
        firstName: string;
        lastName: string;
        email: string;
      }[]
    >`
      SELECT
        pu."userId" AS "userId",
        pu.role AS "role",
        pu."createdAt" AS "membershipCreatedAt",
        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        u.email AS "email"
      FROM "ProjectUsers" pu
      INNER JOIN "User" u ON u.id = pu."userId"
      WHERE pu."projectId" = ${projectId}
        AND u."deletedAt" IS NULL
      ORDER BY pu."createdAt" ASC
    `;

    return rows.map((row) => ({
      userId: row.userId,
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      role: row.role,
      membershipCreatedAt: row.membershipCreatedAt,
    }));
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    userId: number,
  ): Promise<ProjectResponseDto> {
    if (!(await this.ensureProjectMember(id, userId))) {
      throw new ForbiddenException(`You'r not a member in this project`);
    }
    if (!(await this.ensureOwnerProject(id, userId))) {
      throw new ForbiddenException(
        'Only project owners can perform this action',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id, baseEntity: activeBaseEntityWhere },
      select: { baseEntityId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.baseEntity.update({
      where: { id: project.baseEntityId },
      data: updateProjectDto,
    });

    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    if (!(await this.ensureOwnerProject(id, userId))) {
      throw new ForbiddenException('Action not allowed!');
    }

    const project = await this.prisma.project.findFirst({
      where: { id, baseEntity: activeBaseEntityWhere },
      select: { baseEntityId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const childBaseEntityIds = await collectProjectChildBaseEntityIds(
        tx,
        id,
      );
      await softDeleteManyBaseEntities(tx, childBaseEntityIds, userId);
      await softDeleteBaseEntity(tx, project.baseEntityId, userId);
    });

    return { message: 'Project deleted successfully' };
  }

  async restore(id: number, userId: number): Promise<ProjectResponseDto> {
    if (!(await this.ensureOwnerProjectIncludingDeleted(id, userId))) {
      throw new ForbiddenException('Only project owners can restore a project');
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { baseEntityId: true },
    });

    if (!project) {
      throw new NotFoundException('Deleted project not found');
    }

    const baseEntity = await this.prisma.baseEntity.findUnique({
      where: { id: project.baseEntityId },
    });

    const deletedAt = (baseEntity as { deletedAt?: Date | null } | null)
      ?.deletedAt;

    if (!deletedAt) {
      throw new NotFoundException('Deleted project not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const childBaseEntityIds = await collectProjectChildBaseEntityIds(tx, id);
      await restoreManyBaseEntities(tx, childBaseEntityIds);
      await restoreBaseEntity(tx, project.baseEntityId);
    });

    return this.findOne(id, userId);
  }

  async assignUser(
    projectId: number,
    assignProjectUserDto: AssignProjectUserDto,
    currentUserId: number,
  ): Promise<ProjectResponseDto> {
    if (!(await this.ensureProjectMember(projectId, currentUserId))) {
      throw new NotFoundException('Project not found');
    }

    const actorMembership = await this.prisma.projectUsers.findUnique({
      where: {
        projectId_userId: { projectId, userId: currentUserId },
      },
      select: { role: true },
    });

    const canAssign =
      actorMembership?.role === ProjectRole.OWNER ||
      actorMembership?.role === ProjectRole.ADMIN;

    if (!canAssign) {
      throw new ForbiddenException('Action not allowed');
    }

    const existingMembership = await this.prisma.projectUsers.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assignProjectUserDto.userId,
        },
      },
      select: { role: true },
    });

    if (existingMembership?.role === ProjectRole.OWNER) {
      throw new ForbiddenException('Project owner role cannot be changed');
    }

    const user = await findActiveUserById(
      this.prisma,
      assignProjectUserDto.userId,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.projectUsers.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: assignProjectUserDto.userId,
        },
      },
      create: {
        projectId,
        userId: assignProjectUserDto.userId,
        role: assignProjectUserDto.role ?? ProjectRole.MEMBER,
      },
      update: {
        role: assignProjectUserDto.role ?? ProjectRole.MEMBER,
      },
    });

    return this.findOne(projectId, currentUserId);
  }

  private async ensureProjectMember(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const membership = await this.prisma.projectUsers.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { projectId: true },
    });

    
    if (!membership) {
      return false;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, baseEntity: activeBaseEntityWhere },
      select: { baseEntityId: true },
    });

    if (!project) {
      return false;
    }

    return true;
  }

  /** Membership check that still resolves when the project BaseEntity is soft-deleted (for restore). */
  private async ensureOwnerProjectIncludingDeleted(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const membership = await this.prisma.projectUsers.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (!membership) {
      return false;
    }

    return membership.role === ProjectRole.OWNER;
  }

  private async ensureOwnerProject(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    if (!(await this.ensureProjectMember(projectId, userId))) {
      return false;
    }

    const membership = await this.prisma.projectUsers.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (!membership) {
      return false;
    }

    return membership.role === ProjectRole.OWNER;
  }

  private toResponse(project: ProjectWithDetails): ProjectResponseDto {
    return {
      id: project.id,
      name: project.baseEntity.name,
      description: project.baseEntity.description,
      status: project.baseEntity.status
        ? {
            id: project.baseEntity.status.id,
            name: project.baseEntity.status.name,
            type: project.baseEntity.status.type,
          }
        : null,
      members: project.users.map((membership) => ({
        id: membership.id,
        userId: membership.userId,
        role: membership.role,
        email: membership.user.email,
        username: membership.user.username,
        name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
      })),
      sprintCount: project._count.sprints,
      taskCount: project._count.tasks,
      createdAt: project.baseEntity.createdAt,
      updatedAt: project.baseEntity.updatedAt,
    };
  }
}
