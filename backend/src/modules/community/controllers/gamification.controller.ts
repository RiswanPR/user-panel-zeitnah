import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityGamificationService } from '../services/community-gamification.service';

@Controller('community/profile')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(
    private readonly gamificationService: CommunityGamificationService,
  ) {}

  @Get()
  async getProfile(@Req() req: any) {
    const userId = String(
      req.user?.userId || req.user?.id || req.user?._id || '',
    );
    return this.gamificationService.getProfile(userId);
  }
}
