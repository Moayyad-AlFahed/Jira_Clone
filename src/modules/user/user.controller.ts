import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { DeleteUserResponseDto } from './dto/delete-user-response.dto';
import { RestoreUserResponseDto } from './dto/restore-user-response.dto';

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

  @Delete('me')
  @ApiOperation({
    summary: 'Soft-delete the authenticated user',
    description:
      'Sets deletedAt on the current user and revokes refresh tokens in Redis. Access tokens remain valid until expiry.',
  })
  @ApiResponse({ status: 200, type: DeleteUserResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  deleteMe(@CurrentUser('id') userId: number) {
    return this.userService.softDeleteMe(userId);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore a soft-deleted user by id',
    description:
      'Currently only supports self-restore when the caller id matches :id. Prefer POST /auth/restore-account after soft-delete.',
  })
  @ApiResponse({ status: 200, type: RestoreUserResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot restore another user.' })
  @ApiResponse({ status: 404, description: 'Deleted user not found.' })
  restoreById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') currentUserId: number,
  ) {
    return this.userService.restoreById(id, currentUserId);
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
