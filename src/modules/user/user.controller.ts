import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { UserService } from './user.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedUserResponseDto } from './dto/user-response.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, type: PaginatedUserResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get authenticated user profile',
    description:
      'Returns the currently authenticated user profile from the JWT payload.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile returned successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access.',
  })
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the authenticated user using the current-user decorator.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user returned successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  getMe(@CurrentUser() user: AuthenticatedRequest['user']) {
    return user;
  }
}
