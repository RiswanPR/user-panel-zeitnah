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
import {
  OpportunitiesService,
  CreateOpportunityDto,
  UpdateOpportunityDto,
  QueryOpportunitiesDto,
} from './opportunities.service';
import { OpportunityStatus } from './schemas/opportunity.schema';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly oppService: OpportunitiesService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getOpportunities(@Query() query: QueryOpportunitiesDto) {
    return this.oppService.getOpportunities(query);
  }

  @Get(':id')
  async getOpportunityById(@Param('id') id: string) {
    return this.oppService.getOpportunityById(id);
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
}
