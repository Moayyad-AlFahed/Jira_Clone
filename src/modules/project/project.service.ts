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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/http/pagination';

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
      ...(search
        ? {
            baseEntity: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
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
    await this.ensureProjectMember(id, userId);

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectDetailsInclude,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.toResponse(project);
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    userId: number,
  ): Promise<ProjectResponseDto> {
    const project = await this.ensureProjectMember(id, userId);

    await this.prisma.baseEntity.update({
      where: { id: project.baseEntityId },
      data: updateProjectDto,
    });

    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number) {
    const project = await this.ensureProjectMember(id, userId);

    await this.prisma.$transaction([
      this.prisma.project.delete({ where: { id } }),
      this.prisma.baseEntity.delete({ where: { id: project.baseEntityId } }),
    ]);

    return { message: 'Project deleted successfully' };
  }

  async assignUser(
    projectId: number,
    assignProjectUserDto: AssignProjectUserDto,
    currentUserId: number,
  ): Promise<ProjectResponseDto> {
    await this.ensureProjectMember(projectId, currentUserId);

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

    const user = await this.prisma.user.findUnique({
      where: { id: assignProjectUserDto.userId },
    });

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

  private async ensureProjectMember(projectId: number, userId: number) {
    const membership = await this.prisma.projectUsers.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { projectId: true },
    });

    if (!membership) {
      throw new NotFoundException('Project not found');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { baseEntityId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
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
