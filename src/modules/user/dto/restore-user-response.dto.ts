import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class RestoreUserResponseDto {
  @ApiProperty({
    description: 'Confirmation that the user account was restored.',
    example: 'User account restored successfully',
  })
  message: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Restored user profile (no password hash).',
  })
  user: UserResponseDto;
}
