import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignProjectUserDto } from './dto/assign-project-user.dto';
import {
  PaginatedProjectResponseDto,
  ProjectResponseDto,
} from './dto/project-response.dto';
import { DeleteProjectResponseDto } from './dto/delete-project-response.dto';
import {
  ProjectMemberListItemDto,
  ProjectMemberListResponseDto,
} from './dto/project-member-list-item.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@Controller('project')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid project data.' })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser('id') userId: number,
  ) {
    console.log('userId', userId);
    return this.projectService.create(createProjectDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List projects for the authenticated user' })
  @ApiResponse({ status: 200, type: PaginatedProjectResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  findAll(
    @CurrentUser('id') userId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.projectService.findAll(userId, query);
  }

  @Get(':id/members')
  @ApiOperation({
    summary: 'List project members',
    description:
      'Returns collaborators on the project. Requires JWT and project membership. Non-members receive 404.',
  })
  @ApiResponse({ status: 200, type: ProjectMemberListResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication required.' })
  @ApiResponse({
    status: 404,
    description: 'Project not found or caller is not a member.',
  })
  @ApiParam({
    name: 'id',
    description: 'Project identifier.',
    example: 1,
  })
  listMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.listMembers(id, userId);
  }

  @Get(':id/test-membership')
  @ApiOperation({
    summary: 'Test project membership for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'The user is a project member.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  testMembership(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.testProjectMembership(id, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one project' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one project' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid project data.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.update(id, updateProjectDto, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete one project',
    description:
      'Marks the project and its sprint/task BaseEntity rows as deleted. Requires project OWNER role. Rows remain in the database.',
  })
  @ApiResponse({ status: 200, type: DeleteProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Only owners may delete projects.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.remove(id, userId);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore a soft-deleted project',
    description:
      'Clears deletedAt on the project BaseEntity and related sprint/task BaseEntity rows. Requires OWNER membership (including on deleted projects).',
  })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Only owners may restore projects.' })
  @ApiResponse({ status: 404, description: 'Deleted project not found.' })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.restore(id, userId);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Assign a user to a project' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project or user not found.' })
  assignUser(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() assignProjectUserDto: AssignProjectUserDto,
    @CurrentUser('id') currentUserId: number,
  ) {
    return this.projectService.assignUser(
      projectId,
      assignProjectUserDto,
      currentUserId,
    );
  }
}
