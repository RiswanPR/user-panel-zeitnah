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
  OrganizationsService,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  QueryOrganizationsDto,
} from './organizations.service';
import { OrganizationRole } from './schemas/organization-membership.schema';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getOrganizations(@Query() query: QueryOrganizationsDto) {
    return this.orgService.getOrganizations(query);
  }

  @Get(':slug')
  async getOrganizationBySlug(@Param('slug') slug: string) {
    return this.orgService.getOrganizationBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrganization(@Req() req: any, @Body() body: CreateOrganizationDto) {
    return this.orgService.createOrganization(req.user.userId, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateOrganization(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateOrganizationDto,
  ) {
    return this.orgService.updateOrganization(req.user.userId, id, body);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.orgService.getMembers(id);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  async addMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { targetUserId: string; role?: OrganizationRole },
  ) {
    return this.orgService.addMember(
      req.user.userId,
      id,
      body.targetUserId,
      body.role || OrganizationRole.MEMBER,
    );
  }
}
