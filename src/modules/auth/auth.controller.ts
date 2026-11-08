import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { RestoreUserResponseDto } from '../user/dto/restore-user-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new account, hashes the password, and returns the user without the password hash.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already exists.',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Validates credentials via the local strategy and returns JWT access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    type: LoginResponseDto,
    description:
      'Returns access and refresh tokens in the standard { data } envelope.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
  })
  async login(@Body() _dto: LoginDto, @Req() req: AuthenticatedRequest) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Validates a refresh token and returns a new access and refresh token pair.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or revoked refresh token.',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('restore-account')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Restore a soft-deleted account',
    description:
      'Verifies email and password for a soft-deleted user, clears deletedAt, and returns a safe user profile. Does not issue tokens; use login afterward.',
  })
  @ApiResponse({
    status: 200,
    type: RestoreUserResponseDto,
    description: 'Account restored successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account is not deleted.',
  })
  async restoreAccount(@Body() dto: LoginDto) {
    return this.authService.restoreAccount(dto);
  }
}
