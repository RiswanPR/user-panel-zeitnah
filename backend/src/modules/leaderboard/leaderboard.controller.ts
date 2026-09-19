import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Global student learning leaderboard.
   * Returns deterministic ranking, search/filter results, top 3 podium,
   * and current authenticated student's relative position.
   */
  @Get('global')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getGlobalLeaderboard(
    @Query() query: GetLeaderboardDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user.userId || req.user._id;
    return this.leaderboardService.getGlobalLeaderboard(query, currentUserId);
  }

  /**
   * Current student's personal global ranking position and level progression.
   */
  @Get('position')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getMyPosition(@Req() req: any) {
    const currentUserId = req.user.userId || req.user._id;
    return this.leaderboardService.getMyLeaderboardPosition(currentUserId);
  }

  /**
   * Enrolled courses for current student with course XP, rank, and completion metrics.
   */
  @Get('courses')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getMyCoursesLeaderboard(@Req() req: any) {
    const currentUserId = req.user.userId || req.user._id;
    return this.leaderboardService.getMyCoursesLeaderboard(currentUserId);
  }

  /**
   * Course-specific leaderboard. Strictly verifies student enrollment.
   */
  @Get('course/:courseId')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getCourseLeaderboard(
    @Param('courseId') courseId: string,
    @Query() query: GetLeaderboardDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user.userId || req.user._id;
    return this.leaderboardService.getCourseLeaderboard(
      courseId,
      query,
      currentUserId,
    );
  }
}
