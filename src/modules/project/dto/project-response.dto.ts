import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectRole } from 'src/generated/prisma/enums';

class ProjectStatusResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'In Progress' })
  name: string;

  @ApiPropertyOptional({ example: 'IN_PROGRESS', nullable: true })
  type: string | null;
}

class ProjectMemberResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2 })
  userId: number;

  @ApiProperty({ enum: ProjectRole, example: ProjectRole.MEMBER })
  role: ProjectRole;

  @ApiProperty({ example: 'sara@dev.com' })
  email: string;

  @ApiProperty({ example: 'sara' })
  username: string;

  @ApiProperty({ example: 'Sara Ali' })
  name: string;
}

export class ProjectResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Product launch' })
  name: string;

  @ApiPropertyOptional({
    example: 'Coordinate the launch tasks.',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({ type: ProjectStatusResponseDto, nullable: true })
  status: ProjectStatusResponseDto | null;

  @ApiProperty({ type: [ProjectMemberResponseDto] })
  members: ProjectMemberResponseDto[];

  @ApiProperty({ example: 3 })
  sprintCount: number;

  @ApiProperty({ example: 12 })
  taskCount: number;

  @ApiProperty({ example: '2026-09-23T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-23T10:00:00.000Z' })
  updatedAt: Date;
}

class ProjectPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PaginatedProjectResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  data: ProjectResponseDto[];

  @ApiProperty({ type: ProjectPaginationMetaDto })
  meta: ProjectPaginationMetaDto;
}
