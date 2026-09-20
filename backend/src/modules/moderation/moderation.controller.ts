import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModerationService, CreateReportDto } from './moderation.service';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('block')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async blockUser(@Req() req: any, @Body() body: { targetUserId: string }) {
    return this.moderationService.blockUser(req.user.userId, body.targetUserId);
  }

  @Delete('block/:userId')
  async unblockUser(@Req() req: any, @Param('userId') userId: string) {
    return this.moderationService.unblockUser(req.user.userId, userId);
  }

  @Get('blocks')
  async getBlockedUsers(@Req() req: any) {
    return this.moderationService.getExcludedUserIds(req.user.userId);
  }

  @Post('report')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createReport(@Req() req: any, @Body() body: CreateReportDto) {
    return this.moderationService.createReport(req.user.userId, body);
  }
}
