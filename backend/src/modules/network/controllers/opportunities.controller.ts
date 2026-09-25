import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OpportunitiesService } from '../services/opportunities.service';
import {
  QueryOpportunitiesDto,
  QueryOrganizationsDto,
} from '../dto/opportunity.dto';

@ApiTags('Opportunities & Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network')
export class OpportunitiesController {
  constructor(private readonly oppService: OpportunitiesService) {}

  @Get('organizations')
  @ApiOperation({ summary: 'Query organizations' })
  async getOrganizations(@Query() query: QueryOrganizationsDto) {
    return this.oppService.getOrganizations(query);
  }

  @Get('organizations/:slug')
  @ApiOperation({ summary: 'Get organization profile by slug' })
  async getOrganizationBySlug(@Param('slug') slug: string) {
    return this.oppService.getOrganizationBySlug(slug);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Query opportunities' })
  async getOpportunities(@Query() query: QueryOpportunitiesDto) {
    return this.oppService.getOpportunities(query);
  }

  @Get('opportunities/:id')
  @ApiOperation({ summary: 'Get opportunity detail' })
  async getOpportunityById(@Param('id') id: string) {
    return this.oppService.getOpportunityById(id);
  }
}
