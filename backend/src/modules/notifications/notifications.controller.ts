import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('In-App Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  private getUserId(req: any): string {
    return req.user?.userId || req.user?._id || req.user?.id || req.user?.sub;
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications' })
  async getNotifications(@Req() req, @Query() query: any) {
    return this.notifService.getUserNotifications(this.getUserId(req), query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req) {
    const count = await this.notifService.getUnreadCount(this.getUserId(req));
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async patchMarkAsRead(@Req() req, @Param('id') id: string) {
    return this.notifService.markAsRead(id, this.getUserId(req));
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read (POST)' })
  async postMarkAsRead(@Req() req, @Param('id') id: string) {
    return this.notifService.markAsRead(id, this.getUserId(req));
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async patchMarkAllAsRead(@Req() req, @Query('category') category?: string) {
    return this.notifService.markAllAsRead(this.getUserId(req), category);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read (POST)' })
  async postMarkAllAsRead(@Req() req, @Query('category') category?: string) {
    return this.notifService.markAllAsRead(this.getUserId(req), category);
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Clear read notifications' })
  async clearReadNotifications(@Req() req) {
    return this.notifService.clearNotifications(this.getUserId(req));
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Req() req) {
    return this.notifService.getPreferences(this.getUserId(req));
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Req() req, @Body() body: any) {
    return this.notifService.updatePreferences(this.getUserId(req), body);
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register push token' })
  async registerPushToken(@Req() req, @Body() dto: any) {
    return this.notifService.registerPushToken(this.getUserId(req), dto);
  }

  @Delete('push-token/:deviceId')
  @ApiOperation({ summary: 'Remove push token' })
  async removePushToken(@Req() req, @Param('deviceId') deviceId: string) {
    return this.notifService.removePushToken(this.getUserId(req), deviceId);
  }

  @Get('push-devices')
  @ApiOperation({ summary: 'Get push devices' })
  async getPushDevices(@Req() req) {
    return this.notifService.getPushDevices(this.getUserId(req));
  }
}
