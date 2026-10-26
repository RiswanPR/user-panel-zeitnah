import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityModerationService } from '../services/community-moderation.service';

@Controller('community/moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly modService: CommunityModerationService) {}

  private checkModerator(req: any) {
    const role = String(req.user?.role || '')
      .trim()
      .toLowerCase();
    if (role !== 'admin' && role !== 'moderator' && role !== 'superadmin') {
      throw new ForbiddenException('Only moderators can access this endpoint');
    }
  }

  @Get('reports')
  async getReports(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
  ) {
    this.checkModerator(req);
    const parsedLimit = limit
      ? Math.min(Math.max(parseInt(limit, 10), 1), 100)
      : 20;
    const parsedSkip = skip ? Math.max(parseInt(skip, 10), 0) : 0;
    return this.modService.getPendingReports(
      parsedLimit,
      parsedSkip,
      status,
      targetType,
    );
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @Req() req: any,
    @Param('id') reportId: string,
    @Body('action') action: string,
    @Body('notes') notes?: string,
  ) {
    this.checkModerator(req);
    const userId = String(
      req.user?.userId || req.user?.id || req.user?._id || '',
    );
    return this.modService.resolveReport(reportId, userId, action, notes);
  }

  @Post('posts/:id/hide')
  async hidePost(
    @Req() req: any,
    @Param('id') postId: string,
    @Body('reason') reason: string,
  ) {
    this.checkModerator(req);
    const userId = String(
      req.user?.userId || req.user?.id || req.user?._id || '',
    );
    return this.modService.hidePost(postId, userId, reason);
  }
}
