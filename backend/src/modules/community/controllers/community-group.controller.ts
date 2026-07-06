import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CommunityGroupService } from '../services/community-group.service';
import { CreateGroupDto, CreateAnnouncementDto } from '../dto/group.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Community Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/groups')
export class CommunityGroupController {
  constructor(private readonly groupService: CommunityGroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  async createGroup(@Req() req, @Body() data: CreateGroupDto) {
    return this.groupService.createGroup(req.user._id || req.user.sub, data);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a group' })
  async joinGroup(@Req() req, @Param('id') id: string) {
    await this.groupService.joinGroup(id, req.user._id || req.user.sub);
    return { success: true };
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a group' })
  async leaveGroup(@Req() req, @Param('id') id: string) {
    await this.groupService.leaveGroup(id, req.user._id || req.user.sub);
    return { success: true };
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create an announcement' })
  async createAnnouncement(@Req() req, @Body() data: CreateAnnouncementDto) {
    return this.groupService.createAnnouncement(
      req.user._id || req.user.sub,
      data,
    );
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Get announcements' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  async getAnnouncements(
    @Query('courseId') courseId: string,
    @Query('groupId') groupId: string,
  ) {
    return this.groupService.getAnnouncements(courseId, groupId);
  }
}
