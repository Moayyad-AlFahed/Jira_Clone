import { ApiProperty } from '@nestjs/swagger';

export class DeleteProjectResponseDto {
  @ApiProperty({
    description: 'Confirmation that the project was soft-deleted.',
    example: 'Project deleted successfully',
  })
  message: string;
}
