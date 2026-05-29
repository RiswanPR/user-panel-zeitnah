import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

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

}