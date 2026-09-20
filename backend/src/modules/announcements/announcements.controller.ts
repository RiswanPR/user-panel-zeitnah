import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  async getActiveAnnouncements(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.announcementsService.getActiveAnnouncements(String(userId));
  }

  @Get(':id')
  async getAnnouncementById(@Param('id') id: string) {
    return this.announcementsService.getAnnouncementById(id);
  }

  @Post(':id/dismiss')
  async dismissAnnouncement(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.announcementsService.dismissAnnouncement(id, String(userId));
  }
}
