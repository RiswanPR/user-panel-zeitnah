import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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

  // Simple role check for demo purposes. Real app would use a @Roles() guard.
  private checkModerator(req: any) {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      throw new ForbiddenException('Only moderators can access this endpoint');
    }
  }

  @Get('reports')
  async getReports(@Req() req: any) {
    this.checkModerator(req);
    return this.modService.getPendingReports();
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @Req() req: any,
    @Param('id') reportId: string,
    @Body('action') action: string,
    @Body('notes') notes?: string,
  ) {
    this.checkModerator(req);
    return this.modService.resolveReport(reportId, req.user.id, action, notes);
  }

  @Post('posts/:id/hide')
  async hidePost(
    @Req() req: any,
    @Param('id') postId: string,
    @Body('reason') reason: string,
  ) {
    this.checkModerator(req);
    return this.modService.hidePost(postId, req.user.id, reason);
  }
}
