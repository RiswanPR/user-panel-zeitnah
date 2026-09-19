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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ClaimUsernameDto } from './dto/claim-username.dto';

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
  async checkUsername(
    @Query('username') username: string,
    @Req() req: any,
  ) {
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
  async claimUsername(
    @Req() req: any,
    @Body() body: ClaimUsernameDto,
  ) {
    const ip = this.getClientIp(req);
    return this.profileService.claimUsername(req.user.userId, body.username, ip);
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
  async changeUsername(
    @Req() req: any,
    @Body() body: ClaimUsernameDto,
  ) {
    const ip = this.getClientIp(req);
    return this.profileService.changeUsername(req.user.userId, body.username, ip);
  }

  /**
   * Public student profile page resolver (/profile/u/:username).
   */
  @Get('u/:username')
  async getPublicProfile(@Param('username') username: string) {
    return this.profileService.getPublicProfile(username);
  }

  // =========================================================================
  // CORE PROFILE CRUD
  // =========================================================================

  // GET PROFILE
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.profileService.getMe(req.user.userId);
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
  updateProfile(
    @Req() req: any,
    @Body() body: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user.userId, body);
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
}
