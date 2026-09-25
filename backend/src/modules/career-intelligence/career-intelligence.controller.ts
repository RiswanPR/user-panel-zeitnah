import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CareerIntelligenceService } from './career-intelligence.service';
import { SetTargetRolesDto } from './dto/career-target.dto';
import { CareerAssistantQueryDto } from './dto/career-assistant.dto';

@Controller('career-intelligence')
export class CareerIntelligenceController {
  constructor(
    private readonly careerIntelligenceService: CareerIntelligenceService,
  ) {}

  private extractUserId(req: any): string {
    return req.user?.userId || req.user?._id || req.user?.sub;
  }

  // ── 1. Career Overview & Profile Strength ────────────────────────
  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async getOverview(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.getCareerOverview(userId);
  }

  // ── 2. Role Alignments ───────────────────────────────────────────
  @Get('role-alignment')
  @UseGuards(JwtAuthGuard)
  async getRoleAlignments(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.getRoleAlignments(userId);
  }

  // ── 3. Skill Gaps for Target Role ────────────────────────────────
  @Get('skill-gaps')
  @UseGuards(JwtAuthGuard)
  async getSkillGaps(
    @Req() req: any,
    @Query('targetRole') targetRole?: string,
  ) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.getSkillGaps(userId, targetRole);
  }

  // ── 4. Career Pathways Progression ───────────────────────────────
  @Get('pathways')
  @UseGuards(JwtAuthGuard)
  async getCareerPathways(
    @Req() req: any,
    @Query('targetRole') targetRole?: string,
  ) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.getCareerPathways(userId, targetRole);
  }

  // ── 5. Interactive Infrastructure Career Map ─────────────────────
  @Get('career-map')
  @UseGuards(JwtAuthGuard)
  async getInfrastructureCareerMap() {
    return this.careerIntelligenceService.getInfrastructureCareerMap();
  }

  // ── 6. Aggregate Market Benchmarks & Demand Signals ──────────────
  @Get('market-benchmarks')
  @UseGuards(JwtAuthGuard)
  async getMarketBenchmarks() {
    return this.careerIntelligenceService.getMarketBenchmarks();
  }

  // ── 7. Profile Improvement Recommendations ───────────────────────
  @Get('profile-recommendations')
  @UseGuards(JwtAuthGuard)
  async getProfileRecommendations(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.getProfileRecommendations(userId);
  }

  // ── 8. Configure Target Roles ────────────────────────────────────
  @Post('target-roles')
  @UseGuards(JwtAuthGuard)
  async setTargetRoles(@Req() req: any, @Body() dto: SetTargetRolesDto) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.updateTargetRoles(userId, dto);
  }

  // ── 9. AI Career Assistant (Factual Decision Support) ────────────
  @Post('assistant')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async askCareerAssistant(
    @Req() req: any,
    @Body() dto: CareerAssistantQueryDto,
  ) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.askCareerAssistant(
      userId,
      dto.question,
    );
  }

  // ── 10. Force Refresh Career Insight ─────────────────────────────
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async refreshInsight(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.careerIntelligenceService.generateCareerInsight(userId);
  }
}
