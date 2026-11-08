import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserResponseDto {
  @ApiProperty({
    description: 'Confirmation that the user account was soft-deleted.',
    example: 'User account deleted successfully',
  })
  message: string;
}
