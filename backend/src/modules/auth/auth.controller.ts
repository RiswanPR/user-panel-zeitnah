import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthService } from './auth.service';

import { LoginSendOtpDto } from './dto/login-send-otp.dto';

import { LoginVerifyOtpDto } from './dto/login-verify-otp.dto';

import { RegisterSendOtpDto } from './dto/register-send-otp.dto';

import { RegisterVerifyOtpDto } from './dto/register-verify-otp.dto';

import { RefreshTokenDto } from './dto/refresh-token.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler/dist/throttler.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getHeaderValue(req: Request, headerName: string) {
    const value = req.headers[headerName.toLowerCase()];

    return Array.isArray(value) ? value[0] : value;
  }

  private normalizeIp(ip?: string | null) {
    if (!ip) {
      return '';
    }

    let normalizedIp = ip.split(',')[0].trim();

    if (normalizedIp.startsWith('::ffff:')) {
      normalizedIp = normalizedIp.replace('::ffff:', '');
    }

    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(normalizedIp)) {
      normalizedIp = normalizedIp.replace(/:\d+$/, '');
    }

    return normalizedIp;
  }

  private getClientIp(req: Request) {
    return this.normalizeIp(
      this.getHeaderValue(req, 'cf-connecting-ip') ||
        this.getHeaderValue(req, 'true-client-ip') ||
        this.getHeaderValue(req, 'x-real-ip') ||
        this.getHeaderValue(req, 'x-forwarded-for') ||
        req.ip ||
        req.socket?.remoteAddress ||
        '',
    );
  }

  // TEST ROUTE
  @Get()
  test() {
    return {
      success: true,

      message: 'Backend Connected Successfully',
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
    return await this.authService.registerSendOtp(body);
  }

  @Post('register/verify-otp')
  async registerVerifyOtp(
    @Body()
    body: RegisterVerifyOtpDto,

    @Req()
    req: Request,
  ) {
    return await this.authService.registerVerifyOtp(
      body,
      this.getClientIp(req),
    );
  }

  // =========================
  // LOGIN
  // =========================
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000,
    },
  })
  @Post('login/send-otp')
  async loginSendOtp(
    @Body()
    body: LoginSendOtpDto,
  ) {
    return await this.authService.loginSendOtp(body.email);
  }

  @Post('login/verify-otp')
  async loginVerifyOtp(
    @Body()
    body: LoginVerifyOtpDto,

    @Req()
    req: Request,
  ) {
    return await this.authService.loginVerifyOtp(body, this.getClientIp(req));
  }

  @Post('refresh-token')
  async refreshToken(
    @Body()
    body: RefreshTokenDto,
  ) {
    return await this.authService.refreshToken(body.refreshToken);
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

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getActiveSessions(@Req() req: any) {
    return this.authService.getActiveSessions(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:deviceId')
  revokeSession(@Req() req: any, @Param('deviceId') deviceId: string) {
    return this.authService.revokeSession(req.user, deviceId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.authService.logout(req.user);
  }
}
