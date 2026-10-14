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
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import {
  OrganizationsService,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  QueryOrganizationsDto,
  AdminBusinessQueryDto,
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

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyOrganizations(@Req() req: any) {
    return this.orgService.getMyOrganizations(req.user.userId);
  }

  @Get('admin/review')
  @UseGuards(JwtAuthGuard)
  async getOrganizationsForAdmin(
    @Req() req: any,
    @Query() query: AdminBusinessQueryDto,
  ) {
    const isAdmin =
      req.user?.role === 'admin' || req.user?.primaryRole === 'ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return this.orgService.getOrganizationsForAdmin(query);
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard)
  async approveOrganization(@Req() req: any, @Param('id') id: string) {
    const isAdmin =
      req.user?.role === 'admin' || req.user?.primaryRole === 'ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return this.orgService.approveOrganization(req.user.userId, id);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectOrganization(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const isAdmin =
      req.user?.role === 'admin' || req.user?.primaryRole === 'ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return this.orgService.rejectOrganization(req.user.userId, id, body.reason);
  }

  @Patch('admin/:id/suspend')
  @UseGuards(JwtAuthGuard)
  async suspendOrganization(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const isAdmin =
      req.user?.role === 'admin' || req.user?.primaryRole === 'ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return this.orgService.suspendOrganization(
      req.user.userId,
      id,
      body.reason,
    );
  }

  @Patch(':id/resubmit')
  @UseGuards(JwtAuthGuard)
  async resubmitOrganization(@Req() req: any, @Param('id') id: string) {
    return this.orgService.resubmitOrganization(req.user.userId, id);
  }

  @Post('upload-logo')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 15,
      ttl: 60000,
    },
  })
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPG, PNG, and WebP image files are permitted for business logo.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No logo file provided');
    }
    return this.orgService.uploadLogo(req.user.userId, file);
  }

  @Get('followed')
  @UseGuards(JwtAuthGuard)
  async getMyFollowedOrganizations(@Req() req: any) {
    return this.orgService.getMyFollowedOrganizations(req.user.userId);
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async followOrganization(@Req() req: any, @Param('id') id: string) {
    return this.orgService.followOrganization(req.user.userId, id);
  }

  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowOrganization(@Req() req: any, @Param('id') id: string) {
    return this.orgService.unfollowOrganization(req.user.userId, id);
  }

  @Get(':id/follow-status')
  @UseGuards(OptionalJwtAuthGuard)
  async getFollowStatus(@Req() req: any, @Param('id') id: string) {
    const viewerId = req.user?.userId;
    return this.orgService.getFollowStatus(viewerId, id);
  }

  @Patch(':id/notification-preferences')
  @UseGuards(JwtAuthGuard)
  async updateNotificationPreferences(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { notificationsEnabled: boolean },
  ) {
    return this.orgService.updateNotificationPreferences(
      req.user.userId,
      id,
      body.notificationsEnabled,
    );
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  async getOrganizationBySlug(@Param('slug') slug: string, @Req() req: any) {
    const viewerId = req.user?.userId;
    return this.orgService.getOrganizationBySlug(slug, viewerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrganization(
    @Req() req: any,
    @Body() body: CreateOrganizationDto,
  ) {
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
