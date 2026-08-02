import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthenticatedUser, AuthService } from './auth.service';

import { LoginSendOtpDto } from './dto/login-send-otp.dto';

import { LoginVerifyOtpDto } from './dto/login-verify-otp.dto';

import { RegisterSendOtpDto } from './dto/register-send-otp.dto';

import { RegisterVerifyOtpDto } from './dto/register-verify-otp.dto';

import { RefreshTokenDto } from './dto/refresh-token.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, token?: string, refreshToken?: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
    };
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

    if (token) {
      res.cookie('token', token, {
        ...cookieOptions,
        maxAge: SIXTY_DAYS_MS,
      });
    }

    if (refreshToken) {
      res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: SIXTY_DAYS_MS,
      });
    }
  }

  private clearAuthCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
    };
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }

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
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000,
    },
  })
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

    @Res({ passthrough: true })
    res: Response,
  ) {
    const result = await this.authService.registerVerifyOtp(
      body,
      this.getClientIp(req),
    );

    if (result?.token || result?.accessToken) {
      this.setAuthCookies(
        res,
        result.token || result.accessToken,
        result.refreshToken,
      );
    }

    return result;
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

    @Res({ passthrough: true })
    res: Response,
  ) {
    const result = await this.authService.loginVerifyOtp(
      body,
      this.getClientIp(req),
    );

    if (result?.token || result?.accessToken) {
      this.setAuthCookies(
        res,
        result.token || result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post('refresh-token')
  async refreshToken(
    @Body()
    body: RefreshTokenDto,

    @Req()
    req: Request,

    @Res({ passthrough: true })
    res: Response,
  ) {
    const refreshTokenToUse =
      req.cookies?.refreshToken || body?.refreshToken;

    const result = await this.authService.refreshToken(refreshTokenToUse);

    if (result?.accessToken || result?.token) {
      this.setAuthCookies(
        res,
        result.accessToken || result.token,
        result.refreshToken,
      );
    }

    return result;
  }

  // =========================
  // CURRENT USER
  // =========================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return {
      success: true,

      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getActiveSessions(@Req() req: AuthenticatedRequest) {
    return this.authService.getActiveSessions(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:deviceId')
  revokeSession(
    @Req()
    req: AuthenticatedRequest,

    @Param('deviceId')
    deviceId: string,
  ) {
    return this.authService.revokeSession(req.user, deviceId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearAuthCookies(res);
    return this.authService.logout(req.user);
  }
}
