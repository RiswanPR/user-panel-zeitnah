import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';

import {
  ProfileService,
} from './profile.service';

import {
  UpdateProfileDto,
} from './dto/update-profile.dto';

@Controller('profile')

@UseGuards(JwtAuthGuard)

export class ProfileController {

  constructor(
    private profileService:
      ProfileService,
  ) {}

  // GET PROFILE
  @Get('me')

  getMe(
    @Req() req: any,
  ) {

    return this.profileService
      .getMe(
        req.user.userId,
      );

  }

  // UPDATE PROFILE
  @Patch('update')

  updateProfile(

    @Req()
    req: any,

    @Body()
    body: UpdateProfileDto,

  ) {

    return this.profileService
      .updateProfile(
        req.user.userId,
        body,
      );

  }

  // UPLOAD AVATAR
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
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