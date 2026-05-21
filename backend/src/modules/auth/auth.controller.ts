import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { AuthService }
from './auth.service';

import { SendOtpDto }
from './dto/send-otp.dto';

import { VerifyOtpDto }
from './dto/verify-otp.dto';

import { JwtAuthGuard }
from '../../common/guards/jwt-auth.guard';

@Controller('auth')

export class AuthController {

  constructor(
    private readonly authService: AuthService,
  ) {}

  // TEST ROUTE
  @Get()

  test() {

    return {
      success: true,

      message:
        'Backend Connected Successfully',
    };

  }

  // SEND OTP
  @Post('send-otp')

  async sendOtp(
    @Body() body: SendOtpDto,
  ) {

    return await this.authService
      .sendOtp(body.email);

  }

  // VERIFY OTP
  @Post('verify-otp')

  async verifyOtp(
    @Body() body: VerifyOtpDto,
  ) {

    return await this.authService
      .verifyOtp(body);

  }

  // GET CURRENT USER
  @UseGuards(JwtAuthGuard)

  @Get('me')

  getMe(
    @Req() req: Request & {
      user: any;
    },
  ) {

    return {

      success: true,

      user: req.user,

    };

  }

}