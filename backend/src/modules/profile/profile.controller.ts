import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  Query,
  Param,
  UseGuards,
  Post,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ClaimUsernameDto } from './dto/claim-username.dto';
import { ExperienceDto } from './dto/experience.dto';
import { EducationDto } from './dto/education.dto';
import { CertificationDto } from './dto/certification.dto';
import {
  SubmitRecommendationDto,
  UpdateRecommendationStatusDto,
} from './dto/recommendation.dto';
import { PublishProfileDto } from './dto/publish-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private getClientIp(req: any): string {
    const rawIp =
      req.headers?.['cf-connecting-ip'] ||
      req.headers?.['x-real-ip'] ||
      req.headers?.['x-forwarded-for'] ||
      req.ip ||
      req.socket?.remoteAddress ||
      '';
    return String(rawIp).split(',')[0].trim();
  }

  // =========================================================================
  // USERNAME IDENTITY ENDPOINTS
  // =========================================================================

  /**
   * Check current user's username status and whether it has been claimed.
   */
  @Get('username/status')
  @UseGuards(JwtAuthGuard)
  getUsernameStatus(@Req() req: any) {
    return this.profileService.getUsernameStatus(req.user.userId);
  }

  /**
   * Public/Authenticated debounced username availability check.
   */
  @Get('username/check')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async checkUsername(@Query('username') username: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.profileService.checkAvailability(username, currentUserId);
  }

  /**
   * Initial first-time username claim.
   */
  @Post('username/claim')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async claimUsername(@Req() req: any, @Body() body: ClaimUsernameDto) {
    const ip = this.getClientIp(req);
    return this.profileService.claimUsername(
      req.user.userId,
      body.username,
      ip,
    );
  }

  /**
   * Dedicated username change endpoint (subject to 14-day cooldown, validation, and uniqueness).
   */
  @Patch('username')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async changeUsername(@Req() req: any, @Body() body: ClaimUsernameDto) {
    const ip = this.getClientIp(req);
    return this.profileService.changeUsername(
      req.user.userId,
      body.username,
      ip,
    );
  }

  /**
   * Public student profile page resolver (/profile/u/:username).
   */
  @Get('u/:username')
  async getPublicProfile(@Param('username') username: string) {
    return this.profileService.getPublicProfile(username);
  }

  // =========================================================================
  // CORE PROFILE CRUD & MEDIA
  // =========================================================================

  // GET PROFILE
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.profileService.getMe(req.user.userId);
  }

  // INFRASTRUCTURE TAXONOMY
  @Get('taxonomy')
  getTaxonomy() {
    return this.profileService.getInfrastructureTaxonomy();
  }

  // UPDATE PROFILE
  @Patch('update')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.profileService.updateProfile(
      req.user.userId,
      body,
      req.user?.role,
    );
  }

  // ADMIN ASSIGN ROLE (Administrator only)
  @Patch('admin/user/:userId/role')
  @UseGuards(JwtAuthGuard)
  async adminAssignRole(
    @Req() req: any,
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
  ) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
      throw new ForbiddenException('Only administrators can assign roles.');
    }
    return this.profileService.adminAssignRole(
      req.user.userId,
      targetUserId,
      role,
    );
  }

  // UPLOAD AVATAR (Secured with 5MB limit, MIME type verification, and throttling)
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPG, PNG, and WebP image files are permitted for avatar.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No avatar file provided');
    }
    return this.profileService.uploadAvatar(req.user.userId, file);
  }

  // UPLOAD BACKGROUND / BANNER (Secured with 5MB limit, MIME type verification, and throttling)
  @Post('background')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  @UseInterceptors(
    FileInterceptor('background', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPG, PNG, and WebP image files are permitted for background.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadBackground(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No background file provided');
    }
    return this.profileService.uploadBackground(req.user.userId, file);
  }

  // REMOVE BACKGROUND
  @Delete('background')
  @UseGuards(JwtAuthGuard)
  removeBackground(@Req() req: any) {
    return this.profileService.removeBackground(req.user.userId);
  }

  // =========================================================================
  // EXPERIENCE SUBDOCUMENT ENDPOINTS
  // =========================================================================

  @Post('experience')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  addExperience(@Req() req: any, @Body() body: ExperienceDto) {
    return this.profileService.addExperience(req.user.userId, body);
  }

  @Put('experience/:id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  updateExperience(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ExperienceDto,
  ) {
    return this.profileService.updateExperience(req.user.userId, id, body);
  }

  @Delete('experience/:id')
  @UseGuards(JwtAuthGuard)
  deleteExperience(@Req() req: any, @Param('id') id: string) {
    return this.profileService.deleteExperience(req.user.userId, id);
  }

  // =========================================================================
  // EDUCATION SUBDOCUMENT ENDPOINTS
  // =========================================================================

  @Post('education')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  addEducation(@Req() req: any, @Body() body: EducationDto) {
    return this.profileService.addEducation(req.user.userId, body);
  }

  @Put('education/:id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  updateEducation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: EducationDto,
  ) {
    return this.profileService.updateEducation(req.user.userId, id, body);
  }

  @Delete('education/:id')
  @UseGuards(JwtAuthGuard)
  deleteEducation(@Req() req: any, @Param('id') id: string) {
    return this.profileService.deleteEducation(req.user.userId, id);
  }

  // =========================================================================
  // CERTIFICATIONS SUBDOCUMENT ENDPOINTS
  // =========================================================================

  @Post('certifications')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  addCertification(@Req() req: any, @Body() body: CertificationDto) {
    return this.profileService.addCertification(req.user.userId, body);
  }

  @Put('certifications/:id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  updateCertification(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: CertificationDto,
  ) {
    return this.profileService.updateCertification(req.user.userId, id, body);
  }

  @Delete('certifications/:id')
  @UseGuards(JwtAuthGuard)
  deleteCertification(@Req() req: any, @Param('id') id: string) {
    return this.profileService.deleteCertification(req.user.userId, id);
  }

  // =========================================================================
  // PUBLIC PROFILE PUBLISH ENDPOINT
  // =========================================================================

  @Post('public/publish')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  setPublicProfilePublishState(
    @Req() req: any,
    @Body() body: PublishProfileDto,
  ) {
    return this.profileService.setPublicProfilePublishState(
      req.user.userId,
      body.published,
    );
  }

  // =========================================================================
  // RECOMMENDATIONS ENDPOINTS
  // =========================================================================

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  getRecommendations(@Req() req: any) {
    return this.profileService.getRecommendations(req.user.userId);
  }

  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  submitRecommendation(@Req() req: any, @Body() body: SubmitRecommendationDto) {
    return this.profileService.submitRecommendation(req.user.userId, body);
  }

  @Patch('recommendations/:id/status')
  @UseGuards(JwtAuthGuard)
  updateRecommendationStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateRecommendationStatusDto,
  ) {
    return this.profileService.updateRecommendationStatus(
      req.user.userId,
      id,
      body.status,
    );
  }

  @Delete('recommendations/:id')
  @UseGuards(JwtAuthGuard)
  deleteRecommendation(@Req() req: any, @Param('id') id: string) {
    return this.profileService.deleteRecommendation(req.user.userId, id);
  }
}
