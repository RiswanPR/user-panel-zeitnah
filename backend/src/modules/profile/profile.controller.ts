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
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
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
import { UpdatePortfolioDto } from './dto/portfolio.dto';
import {
  CreateVerificationRequestDto,
  ReviewVerificationRequestDto,
} from './dto/verification.dto';

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

  // =========================================================================
  // PHASE 8: PROFESSIONAL PORTFOLIO ENDPOINTS
  // =========================================================================

  /**
   * Get current authenticated user's portfolio.
   */
  @Get('portfolio')
  @UseGuards(JwtAuthGuard)
  getMyPortfolio(@Req() req: any) {
    return this.profileService.getPortfolio(
      req.user.userId,
      true,
      req.user.userId,
      req.user?.role,
    );
  }

  /**
   * Get public portfolio of any user by username.
   */
  @Get('portfolio/u/:username')
  @UseGuards(OptionalJwtAuthGuard)
  getPublicPortfolioByUsername(
    @Param('username') username: string,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.userId;
    const currentRole = req.user?.role;
    return this.profileService.getPublicPortfolio(
      username,
      currentUserId,
      currentRole,
    );
  }

  /**
   * Update portfolio curation settings.
   */
  @Patch('portfolio')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  updatePortfolio(@Req() req: any, @Body() body: UpdatePortfolioDto) {
    return this.profileService.updatePortfolio(req.user.userId, body);
  }

  /**
   * Upload resume / CV (PDF max 10MB).
   */
  @Post('portfolio/resume')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('resume', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Only PDF files are permitted for resumes.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadResume(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadResume(req.user.userId, file);
  }

  /**
   * Delete resume / CV.
   */
  @Delete('portfolio/resume')
  @UseGuards(JwtAuthGuard)
  deleteResume(@Req() req: any) {
    return this.profileService.deleteResume(req.user.userId);
  }

  /**
   * Authorized download URL for candidate resume.
   */
  @Get('portfolio/resume/:userId/download')
  @UseGuards(JwtAuthGuard)
  getResumeDownloadUrl(
    @Param('userId') targetUserId: string,
    @Req() req: any,
  ) {
    return this.profileService.getResumeDownloadUrl(
      targetUserId,
      req.user.userId,
      req.user?.role,
    );
  }

  /**
   * Upload media for portfolio project.
   */
  @Post('portfolio/media')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPG, PNG, WebP, and PDF files are permitted.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadPortfolioMedia(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { projectId?: string; name?: string; caption?: string; visibility?: string },
  ) {
    return this.profileService.uploadPortfolioMedia(req.user.userId, file, body);
  }

  /**
   * Delete media from project.
   */
  @Delete('portfolio/media/:id')
  @UseGuards(JwtAuthGuard)
  deletePortfolioMedia(
    @Req() req: any,
    @Param('id') mediaId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.profileService.deletePortfolioMedia(
      req.user.userId,
      mediaId,
      projectId,
    );
  }

  // =========================================================================
  // PHASE 8: VERIFICATION CENTER ENDPOINTS
  // =========================================================================

  /**
   * Get verification center overview and history.
   */
  @Get('verification')
  @UseGuards(JwtAuthGuard)
  getVerificationCenter(@Req() req: any) {
    return this.profileService.getVerificationCenter(req.user.userId);
  }

  /**
   * Submit a verification request with private evidence documents.
   */
  @Post('verification/request')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FilesInterceptor('evidence', 5, {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Evidence files must be JPG, PNG, WebP, or PDF format.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  submitVerificationRequest(
    @Req() req: any,
    @Body() body: CreateVerificationRequestDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.profileService.submitVerificationRequest(
      req.user.userId,
      body,
      files,
    );
  }

  /**
   * Authorized download for private verification evidence.
   */
  @Get('verification/evidence/:requestId/:fileId')
  @UseGuards(JwtAuthGuard)
  getVerificationEvidenceUrl(
    @Req() req: any,
    @Param('requestId') requestId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.profileService.getVerificationEvidenceUrl(
      req.user.userId,
      req.user?.role,
      requestId,
      fileId,
    );
  }

  /**
   * Administrator review for verification requests.
   */
  @Post('verification/admin/review/:requestId')
  @UseGuards(JwtAuthGuard)
  adminReviewVerification(
    @Req() req: any,
    @Param('requestId') requestId: string,
    @Body() body: ReviewVerificationRequestDto,
  ) {
    if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
      throw new ForbiddenException(
        'Only platform administrators can review verification requests.',
      );
    }
    return this.profileService.adminReviewVerificationRequest(
      req.user.userId,
      requestId,
      body,
    );
  }
}
