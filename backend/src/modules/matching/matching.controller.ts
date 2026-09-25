import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // ── Trigger matching for a job ──────────────────────────────────
  @Post('jobs/:jobId/trigger')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async triggerMatching(@Req() req: any, @Param('jobId') jobId: string) {
    return this.matchingService.triggerJobMatching(jobId, req.user.userId);
  }

  // ── Get recommended talent for a job ────────────────────────────
  @Get('jobs/:jobId/talent')
  @UseGuards(JwtAuthGuard)
  async getRecommendedTalent(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('saved') saved?: string,
  ) {
    return this.matchingService.getRecommendedTalent(req.user.userId, jobId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category,
      saved,
    });
  }

  // ── Get match summary for a job ─────────────────────────────────
  @Get('jobs/:jobId/summary')
  @UseGuards(JwtAuthGuard)
  async getJobMatchSummary(@Req() req: any, @Param('jobId') jobId: string) {
    return this.matchingService.getJobMatchSummary(req.user.userId, jobId);
  }

  // ── Toggle save candidate for a job ─────────────────────────────
  @Post('jobs/:jobId/candidates/:candidateUserId/save')
  @UseGuards(JwtAuthGuard)
  async toggleSaveCandidate(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Param('candidateUserId') candidateUserId: string,
  ) {
    return this.matchingService.toggleSaveCandidate(
      req.user.userId,
      jobId,
      candidateUserId,
    );
  }

  // ── Dismiss / remove candidate from recommendations ─────────────
  @Post('jobs/:jobId/candidates/:candidateUserId/dismiss')
  @UseGuards(JwtAuthGuard)
  async dismissCandidate(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Param('candidateUserId') candidateUserId: string,
  ) {
    return this.matchingService.dismissCandidate(
      req.user.userId,
      jobId,
      candidateUserId,
    );
  }

  // ── Send opportunity invite ─────────────────────────────────────
  @Post('jobs/:jobId/invite')
  @UseGuards(JwtAuthGuard)
  async sendOpportunityInvite(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() body: { candidateUserId: string; message?: string },
  ) {
    return this.matchingService.sendOpportunityInvite(
      req.user.userId,
      jobId,
      body.candidateUserId,
      body.message || '',
    );
  }

  // ── Candidate: Get my received invites ──────────────────────────
  @Get('invites/my')
  @UseGuards(JwtAuthGuard)
  async getMyInvites(@Req() req: any) {
    return this.matchingService.getMyInvites(req.user.userId);
  }

  // ── Candidate: View an invite ───────────────────────────────────
  @Patch('invites/:inviteId/view')
  @UseGuards(JwtAuthGuard)
  async markInviteViewed(@Req() req: any, @Param('inviteId') inviteId: string) {
    return this.matchingService.markInviteViewed(req.user.userId, inviteId);
  }

  // ── Candidate: Respond to invite ────────────────────────────────
  @Patch('invites/:inviteId/respond')
  @UseGuards(JwtAuthGuard)
  async respondToInvite(
    @Req() req: any,
    @Param('inviteId') inviteId: string,
    @Body() body: { response: 'interested' | 'declined' },
  ) {
    return this.matchingService.respondToInvite(
      req.user.userId,
      inviteId,
      body.response,
    );
  }

  // ── Recruiter talent search ─────────────────────────────────────
  @Get('talent/search')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async searchTalent(
    @Req() req: any,
    @Query('orgId') orgId: string,
    @Query('discipline') discipline?: string,
    @Query('sector') sector?: string,
    @Query('software') software?: string,
    @Query('skill') skill?: string,
    @Query('location') location?: string,
    @Query('minExperience') minExperience?: string,
    @Query('maxExperience') maxExperience?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchingService.searchTalent(req.user.userId, orgId, {
      discipline,
      sector,
      software,
      skill,
      location,
      minExperience: minExperience ? Number(minExperience) : undefined,
      maxExperience: maxExperience ? Number(maxExperience) : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 15,
    });
  }

  // =========================================================================
  // PHASE 4: CANDIDATE "JOBS FOR YOU" ENDPOINTS
  // =========================================================================

  // ── Candidate: Get personalized "Jobs For You" ──────────────────
  @Get('recommended-jobs')
  @UseGuards(JwtAuthGuard)
  async getRecommendedJobs(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    return this.matchingService.getRecommendedJobs(req.user.userId, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      category,
      type,
    });
  }

  // ── Candidate: Refresh personalized recommendations ─────────────
  @Post('recommended-jobs/refresh')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refreshRecommendedJobs(@Req() req: any) {
    return this.matchingService.triggerUserJobRecommendations(req.user.userId);
  }

  // ── Candidate: Get "Why this job matches" explanation ───────────
  @Get('recommended-jobs/:jobId/explanation')
  @UseGuards(JwtAuthGuard)
  async getJobRecommendationExplanation(
    @Req() req: any,
    @Param('jobId') jobId: string,
  ) {
    return this.matchingService.getJobRecommendationExplanation(
      req.user.userId,
      jobId,
    );
  }

  // ── Candidate: Get career profile insights & improvement advice ──
  @Get('profile-job-insights')
  @UseGuards(JwtAuthGuard)
  async getProfileJobInsights(@Req() req: any) {
    return this.matchingService.getProfileJobInsights(req.user.userId);
  }

  // ── Candidate: Hide recommended job ─────────────────────────────
  @Post('recommended-jobs/:jobId/hide')
  @UseGuards(JwtAuthGuard)
  async hideRecommendedJob(@Req() req: any, @Param('jobId') jobId: string) {
    return this.matchingService.hideRecommendedJob(req.user.userId, jobId);
  }

  // ── Candidate: Dismiss recommended job ──────────────────────────
  @Post('recommended-jobs/:jobId/dismiss')
  @UseGuards(JwtAuthGuard)
  async dismissRecommendedJob(@Req() req: any, @Param('jobId') jobId: string) {
    return this.matchingService.dismissRecommendedJob(req.user.userId, jobId);
  }

  // ── Candidate: Submit feedback on recommended job ───────────────
  @Post('recommended-jobs/:jobId/feedback')
  @UseGuards(JwtAuthGuard)
  async recordJobFeedback(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() body: { feedback: 'INTERESTED' | 'NOT_INTERESTED' },
  ) {
    return this.matchingService.recordJobFeedback(
      req.user.userId,
      jobId,
      body.feedback,
    );
  }
}
