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

import { LoginSendOtpDto }
from './dto/login-send-otp.dto';

import { LoginVerifyOtpDto }
from './dto/login-verify-otp.dto';

import { RegisterSendOtpDto }
from './dto/register-send-otp.dto';

import { RegisterVerifyOtpDto }
from './dto/register-verify-otp.dto';

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

  // =========================
  // REGISTER
  // =========================

  @Post('register/send-otp')

  async registerSendOtp(
    @Body()
    body: RegisterSendOtpDto,
  ) {

    return await this.authService
      .registerSendOtp(body);

  }

  @Post('register/verify-otp')

  async registerVerifyOtp(
    @Body()
    body: RegisterVerifyOtpDto,
  ) {

    return await this.authService
      .registerVerifyOtp(body);

  }

  // =========================
  // LOGIN
  // =========================

  @Post('login/send-otp')

  async loginSendOtp(
    @Body()
    body: LoginSendOtpDto,
  ) {

    return await this.authService
      .loginSendOtp(body.email);

  }

  @Post('login/verify-otp')

  async loginVerifyOtp(
    @Body()
    body: LoginVerifyOtpDto,
  ) {

    return await this.authService
      .loginVerifyOtp(body);

  }

  // =========================
  // CURRENT USER
  // =========================

  @UseGuards(JwtAuthGuard)

  @Get('me')

  getMe(
    @Req()
    req: Request & {
      user: any;
    },
  ) {

    return {

      success: true,

      user: req.user,

    };

  }

}