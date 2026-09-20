import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preference.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @Req() req: any,
    @Query() query: GetNotificationsDto,
  ) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.getUserNotifications(String(userId), query);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    const count = await this.notificationsService.getUnreadCount(String(userId));
    return { unreadCount: count };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.markAsRead(String(userId), id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any, @Query('category') category?: string) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.markAllAsRead(String(userId), category);
  }

  @Delete('clear-read')
  async clearReadNotifications(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.clearNotifications(String(userId));
  }

  @Get('preferences')
  async getPreferences(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.getUserPreferences(String(userId));
  }

  @Patch('preferences')
  async updatePreferences(
    @Req() req: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.updateUserPreferences(String(userId), dto);
  }

  // ── Push Device Registration Endpoints ──
  @Post('push-token')
  async registerPushToken(
    @Req() req: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.registerPushToken(String(userId), dto);
  }

  @Delete('push-token/:deviceId')
  async removePushToken(
    @Req() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.removePushToken(String(userId), deviceId);
  }

  @Get('push-devices')
  async getPushDevices(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.getPushDevices(String(userId));
  }
}
