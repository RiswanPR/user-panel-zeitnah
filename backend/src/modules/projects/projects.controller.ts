import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyProjects(@Req() req: any) {
    return this.projectsService.getUserProjects(req.user.userId, true);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProject(@Req() req: any, @Body() body: CreateProjectDto) {
    return this.projectsService.createProject(req.user.userId, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateProject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(req.user.userId, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteProject(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteProject(req.user.userId, id);
  }

  @Get('user/:userId')
  async getUserProjects(@Param('userId') userId: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    const isOwner = Boolean(currentUserId && currentUserId === userId);
    return this.projectsService.getUserProjects(userId, isOwner);
  }
}
