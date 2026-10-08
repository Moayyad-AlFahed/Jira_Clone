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
  @ApiOperation({ summary: 'Delete one project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.projectService.remove(id, userId);
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
