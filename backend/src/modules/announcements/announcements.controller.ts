import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Platform Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  private getUserId(req: any): string {
    return req.user?.userId || req.user?._id || req.user?.id || req.user?.sub;
  }

  private getUserRole(req: any): string {
    return req.user?.role || 'student';
  }

  @Get('platform')
  @ApiOperation({ summary: 'Get active platform announcements for user' })
  async getPlatformAnnouncements(@Req() req) {
    return this.announcementsService.getActivePlatformAnnouncements(
      this.getUserId(req),
      this.getUserRole(req),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get active platform announcements' })
  async getActiveAnnouncements(@Req() req) {
    return this.announcementsService.getActivePlatformAnnouncements(
      this.getUserId(req),
      this.getUserRole(req),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement by ID' })
  async getAnnouncementById(@Param('id') id: string) {
    return this.announcementsService.getAnnouncementById(id);
  }

  @Post('platform/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss a platform announcement' })
  async dismissPlatformAnnouncement(@Req() req, @Param('id') id: string) {
    return this.announcementsService.dismissAnnouncement(id, this.getUserId(req));
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss announcement' })
  async dismissAnnouncement(@Req() req, @Param('id') id: string) {
    return this.announcementsService.dismissAnnouncement(id, this.getUserId(req));
  }
}
