import { ApiProperty } from '@nestjs/swagger';

class LoginTokensDto {
  @ApiProperty({
    description: 'JWT access token for Authorization: Bearer',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for POST /auth/refresh',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginTokensDto })
  data: LoginTokensDto;
}
