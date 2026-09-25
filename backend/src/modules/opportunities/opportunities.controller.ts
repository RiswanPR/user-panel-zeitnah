import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import {
  OpportunitiesService,
  CreateOpportunityDto,
  UpdateOpportunityDto,
  QueryOpportunitiesDto,
} from './opportunities.service';
import { OpportunityStatus } from './schemas/opportunity.schema';

import { SendOpportunityDto } from './dto/send-opportunity.dto';
import { DeclineOpportunityDto } from './dto/opportunity-response.dto';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly oppService: OpportunitiesService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @UseGuards(OptionalJwtAuthGuard)
  async getOpportunities(
    @Query() query: QueryOpportunitiesDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.userId;
    return this.oppService.getOpportunities(query, currentUserId);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  async getSavedJobs(@Req() req: any) {
    return this.oppService.getSavedJobs(req.user.userId);
  }

  @Get('my/applications')
  @UseGuards(JwtAuthGuard)
  async getMyApplications(@Req() req: any) {
    return this.oppService.getMyApplications(req.user.userId);
  }

  @Get('business/:orgId')
  @UseGuards(JwtAuthGuard)
  async getBusinessJobs(
    @Req() req: any,
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
  ) {
    return this.oppService.getBusinessJobs(req.user.userId, orgId, status);
  }

  @Patch('applications/:applicationId/withdraw')
  @UseGuards(JwtAuthGuard)
  async withdrawApplication(
    @Req() req: any,
    @Param('applicationId') applicationId: string,
  ) {
    return this.oppService.withdrawApplication(req.user.userId, applicationId);
  }

  // =========================================================================
  // PHASE 8: OPPORTUNITY OUTREACH & CANDIDATE INBOX ENDPOINTS
  // =========================================================================

  @Get('inbox/unread-count')
  @UseGuards(JwtAuthGuard)
  async getInboxUnreadCount(@Req() req: any) {
    return this.oppService.getInboxUnreadCount(req.user.userId);
  }

  @Get('inbox')
  @UseGuards(JwtAuthGuard)
  async getCandidateInbox(
    @Req() req: any,
    @Query('tab') tab?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.oppService.getCandidateInbox(
      req.user.userId,
      tab,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('inbox/:id')
  @UseGuards(JwtAuthGuard)
  async getCandidateOpportunityById(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.oppService.getCandidateOpportunityById(req.user.userId, id);
  }

  @Post('inbox/:id/interested')
  @UseGuards(JwtAuthGuard)
  async markOpportunityInterested(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.oppService.markOpportunityInterested(req.user.userId, id);
  }

  @Post('inbox/:id/decline')
  @UseGuards(JwtAuthGuard)
  async declineOpportunity(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: DeclineOpportunityDto,
  ) {
    return this.oppService.declineOpportunity(req.user.userId, id, body);
  }

  @Post('inbox/:id/archive')
  @UseGuards(JwtAuthGuard)
  async archiveOpportunity(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.oppService.archiveOpportunity(req.user.userId, id);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async sendEmployerOpportunity(
    @Req() req: any,
    @Body() body: SendOpportunityDto,
  ) {
    return this.oppService.sendEmployerOpportunity(req.user.userId, body);
  }

  // Fallback aliases for direct :id paths
  @Post(':id/interested')
  @UseGuards(JwtAuthGuard)
  async markOpportunityInterestedAlias(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.oppService.markOpportunityInterested(req.user.userId, id);
  }

  @Post(':id/decline')
  @UseGuards(JwtAuthGuard)
  async declineOpportunityAlias(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: DeclineOpportunityDto,
  ) {
    return this.oppService.declineOpportunity(req.user.userId, id, body);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  async archiveOpportunityAlias(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.oppService.archiveOpportunity(req.user.userId, id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getOpportunityById(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.oppService.getOpportunityById(id, currentUserId);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  async getJobApplications(@Req() req: any, @Param('id') id: string) {
    return this.oppService.getJobApplications(req.user.userId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOpportunity(@Req() req: any, @Body() body: CreateOpportunityDto) {
    return this.oppService.createOpportunity(req.user.userId, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateOpportunity(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateOpportunityDto,
  ) {
    return this.oppService.updateOpportunity(req.user.userId, id, body);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: OpportunityStatus },
  ) {
    return this.oppService.updateStatus(req.user.userId, id, body.status);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  async saveJob(@Req() req: any, @Param('id') id: string) {
    return this.oppService.saveJob(req.user.userId, id);
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  async unsaveJob(@Req() req: any, @Param('id') id: string) {
    return this.oppService.unsaveJob(req.user.userId, id);
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard)
  async applyToJob(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { resumeUrl?: string; coverNote?: string },
  ) {
    return this.oppService.applyToJob(req.user.userId, id, body);
  }
}
