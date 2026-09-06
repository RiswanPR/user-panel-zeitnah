import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-token')
  async registerPushToken(
    @Req() req: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.registerPushToken(userId, dto);
  }

  @Delete('push-token/:deviceId')
  async removePushToken(
    @Req() req: any,
    @Param('deviceId') deviceId: string,
  ) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.removePushToken(userId, deviceId);
  }

  @Get('push-devices')
  async getPushDevices(@Req() req: any) {
    const userId = req.user.userId || req.user._id || req.user.id;
    return this.notificationsService.getPushDevices(userId);
  }
}
