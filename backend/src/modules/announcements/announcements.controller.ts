import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /**
   * GET /announcements/active
   * Retrieves active, un-dismissed announcements for the current student.
   * Works for both authenticated users and guests.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('active')
  async getActiveAnnouncements(@Req() req: any) {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const announcements = await this.announcementsService.getActiveAnnouncements(userId);
    return { announcements };
  }

  /**
   * GET /announcements
   * Retrieves all active announcements (including dismissed ones) for Notification Center history.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getAllAnnouncements(@Req() req: any) {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const announcements = await this.announcementsService.getAllAnnouncements(userId);
    return { announcements };
  }

  /**
   * POST /announcements/mark-all-read
   * Marks all active announcements as read for the authenticated student.
   */
  @UseGuards(JwtAuthGuard)
  @Post('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.announcementsService.markAllAsRead(userId);
  }

  /**
   * POST /announcements/:id/read
   * Marks a specific announcement as read for the authenticated student.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.announcementsService.markAsRead(id, userId);
  }

  /**
   * POST /announcements/:id/dismiss
   * Dismisses a specific announcement from the student's primary banner.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/dismiss')
  async markAsDismissed(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.announcementsService.markAsDismissed(id, userId);
  }
}
