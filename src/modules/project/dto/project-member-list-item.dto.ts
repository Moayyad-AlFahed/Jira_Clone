import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from 'src/generated/prisma/enums';

export class ProjectMemberListItemDto {
  @ApiProperty({
    description: 'Unique identifier of the user account.',
    example: 2,
  })
  userId: number;

  @ApiProperty({
    description: 'Display name from first and last name.',
    example: 'Sara Ali',
  })
  name: string;

  @ApiProperty({
    description: 'User email address.',
    example: 'sara@dev.com',
  })
  email: string;

  @ApiProperty({
    enum: ProjectRole,
    description: 'Role assigned to the user within this project.',
    example: ProjectRole.MEMBER,
  })
  role: ProjectRole;

  @ApiProperty({
    description: 'When the user was added to the project.',
    example: '2026-09-23T10:00:00.000Z',
  })
  membershipCreatedAt: Date;
}

export class ProjectMemberListResponseDto {
  @ApiProperty({ type: [ProjectMemberListItemDto] })
  data: ProjectMemberListItemDto[];
}
