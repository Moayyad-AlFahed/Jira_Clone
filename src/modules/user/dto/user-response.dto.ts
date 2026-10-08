import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ahmed' })
  username: string;

  @ApiProperty({ example: 'Ahmed' })
  firstName: string;

  @ApiProperty({ example: 'Darwin' })
  lastName: string;

  @ApiProperty({ example: 'ahmed@dev.com' })
  email: string;

  @ApiProperty({ example: '2026-09-23T10:00:00.000Z' })
  createdAt: Date;
}

class UserPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PaginatedUserResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: UserPaginationMetaDto })
  meta: UserPaginationMetaDto;
}
