import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';

import * as crypto from 'crypto';

import { JwtService } from '@nestjs/jwt';

import { resend } from '../../config/resend.config';

import { User, UserDocument } from './schemas/user.schema';

import { LoginVerifyOtpDto } from './dto/login-verify-otp.dto';

import { RegisterSendOtpDto } from './dto/register-send-otp.dto';

import { RegisterVerifyOtpDto } from './dto/register-verify-otp.dto';
import { LoginHistoryService } from '../login-history/login-history.service';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn =
    process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  private readonly refreshTokenExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  private readonly refreshTokenExpiryMs =
    Number(process.env.JWT_REFRESH_EXPIRES_IN_MS) ||
    30 * 24 * 60 * 60 * 1000;

  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private loginHistoryService: LoginHistoryService,
    private jwtService: JwtService,
  ) {}

  private async generateAuthTokens(user: UserDocument, deviceId: string) {
    const payload = {
      userId: user._id.toString(),

      role: user.role,

      deviceId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,

      expiresIn: this.refreshTokenExpiresIn as any,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    return {
      accessToken,

      refreshToken,

      refreshTokenHash,

      refreshTokenExpiry: new Date(
        Date.now() + this.refreshTokenExpiryMs,
      ),
    };
  }

  // ==================================================
  // REGISTER SEND OTP
  // ==================================================

  async registerSendOtp(data: RegisterSendOtpDto) {
    const existingUser = await this.userModel.findOne({
      email: data.email,
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Expiry
    const otpExpiry = new Date(Date.now() + 3 * 60 * 1000);

    // Create temporary user
    const user = await this.userModel.create({
      name: data.name,

      email: data.email,

      otp: hashedOtp,

      otpExpiry,

      isVerified: false,
    });

    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          'LMS Platform <onboarding@resend.dev>',

        to: data.email,

        subject: 'Registration OTP',

        html: `
          <div style="font-family:sans-serif">

            <h2>Registration OTP</h2>

            <h1>${otp}</h1>

            <p>
              OTP valid for 3 minutes
            </p>

          </div>
        `,
      });
      console.log(`OTP for ${data.email}: ${otp}`);
    } catch (error) {
      throw new BadRequestException('Failed to send OTP email');
    }

    return {
      message: 'OTP sent successfully',

      email: data.email,
    };
  }

  // ==================================================
  // REGISTER VERIFY OTP
  // ==================================================
  async registerVerifyOtp(data: RegisterVerifyOtpDto, ip: string) {
    const user = await this.userModel.findOne({
      email: data.email,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.isBlocked) {
      throw new UnauthorizedException('Account blocked');
    }

    // CHECK OTP EXPIRY
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('OTP expired');
    }

    // CHECK OTP EXISTS
    if (!user.otp) {
      throw new UnauthorizedException('OTP not found');
    }

    // VERIFY OTP
    const isOtpValid = await bcrypt.compare(data.otp, user.otp);

    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // =========================
    // DEVICE LIMIT SYSTEM
    // =========================

    const existingDevice: any = user.devices.find(
      (device: any) => device.deviceId === data.deviceId,
    );

    // NEW DEVICE
    if (!existingDevice) {
      // CHECK SAME DEVICE TYPE
      const sameTypeDevice: any = user.devices.find(
        (device: any) => device.deviceType === data.deviceType,
      );
      if (existingDevice) {
        existingDevice.lastSeen = new Date();
      }

      // ASK REPLACEMENT
      if (sameTypeDevice) {
        if (!data.forceLogin) {
          return {
            replaceDevice: true,

            message: `Another ${data.deviceType} device is already logged in`,
          };
        }

        // REMOVE OLD DEVICE
        user.devices = user.devices.filter(
          (device: any) => device.deviceType !== data.deviceType,
        );
      }

      // MAX 2 DEVICES
      if (user.devices.length >= 2) {
        throw new UnauthorizedException('Device limit exceeded');
      }

      // ADD DEVICE
      user.devices.push({
        deviceId: data.deviceId,

        deviceType: data.deviceType,

        browser: data.browser,

        os: data.os,

        ip,

        location: data.location || 'Unknown',

        lastSeen: new Date(),

        refreshToken: null,

        refreshTokenExpiry: null,
      });
    }

    // CLEAR OTP
    user.otp = null;

    user.otpExpiry = null;

    // DEFAULT VERIFICATION STATUS
    user.isVerified = false;

    const device: any = user.devices.find(
      (currentDevice: any) => currentDevice.deviceId === data.deviceId,
    );

    const tokens = await this.generateAuthTokens(
      user,
      data.deviceId,
    );

    if (device) {
      device.refreshToken = tokens.refreshTokenHash;

      device.refreshTokenExpiry = tokens.refreshTokenExpiry;

      device.lastSeen = new Date();
    }

    await user.save();

    await this.loginHistoryService.create({
      user: user._id,

      deviceId: data.deviceId,

      deviceType: data.deviceType,

      browser: data.browser,

      os: data.os,

      ipAddress: data.ip || '',
    });
    return {
      message: 'Registration successful',

      token: tokens.accessToken,

      accessToken: tokens.accessToken,

      refreshToken: tokens.refreshToken,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,

        userVerification: user.isVerified,
      },
    };
  }
  // ==================================================
  // LOGIN SEND OTP
  // ==================================================

  async loginSendOtp(email: string) {
    const user = await this.userModel.findOne({
      email,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Expiry
    const otpExpiry = new Date(Date.now() + 3 * 60 * 1000);

    // Save OTP
    user.otp = hashedOtp;

    user.otpExpiry = otpExpiry;

    await user.save();

    try {
      console.log(`OTP for ${email}: ${otp}`);
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          'LMS Platform <onboarding@resend.dev>',

        to: email,

        subject: 'Login OTP',

        html: `
          <div style="font-family:sans-serif">

            <h2>Your Login OTP</h2>

            <h1>${otp}</h1>

            <p>
              OTP valid for 3 minutes
            </p>

          </div>
        `,
      });
    } catch (error) {
      throw new BadRequestException('Failed to send OTP email');
    }

    return {
      message: 'OTP sent successfully',
    };
  }

  // ==================================================
  // LOGIN VERIFY OTP
  // ==================================================
  async loginVerifyOtp(data: LoginVerifyOtpDto, ip: string) {
    const user = await this.userModel.findOne({
      email: data.email,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.isBlocked) {
      throw new UnauthorizedException('Account blocked');
    }

    // OTP Expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('OTP expired');
    }

    // OTP Exists
    if (!user.otp) {
      throw new UnauthorizedException('OTP not found');
    }

    // Compare OTP
    const isOtpValid = await bcrypt.compare(data.otp, user.otp);

    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid OTP');
    } // =========================
    // DEVICE LIMIT SYSTEM
    // =========================

    const existingDevice: any = user.devices.find(
      (device: any) => device.deviceId === data.deviceId,
    );

    // NEW DEVICE
    if (!existingDevice) {
      // CHECK SAME DEVICE TYPE
      const sameTypeDevice: any = user.devices.find(
        (device: any) => device.deviceType === data.deviceType,
      );
      if (existingDevice) {
        existingDevice.lastSeen = new Date();
      }

      // SAME TYPE DEVICE EXISTS
      if (sameTypeDevice) {
        // ASK REPLACE DEVICE
        if (!data.forceLogin) {
          return {
            replaceDevice: true,

            message: `Another ${data.deviceType} device is already logged in`,
          };
        }

        // REMOVE OLD DEVICE
        user.devices = user.devices.filter(
          (device: any) => device.deviceType !== data.deviceType,
        );
      }

      // MAX TOTAL DEVICES
      if (user.devices.length >= 2) {
        throw new UnauthorizedException('Device limit exceeded');
      }

      // ADD NEW DEVICE
      user.devices.push({
        deviceId: data.deviceId,

        deviceType: data.deviceType,

        browser: data.browser,

        os: data.os,

        ip: data.ip || '',

        location: data.location || 'Unknown',

        lastSeen: new Date(),

        refreshToken: null,

        refreshTokenExpiry: null,
      });
    }

    await this.loginHistoryService.create({
      user: user._id,

      deviceId: data.deviceId,

      deviceType: data.deviceType,

      browser: data.browser,

      os: data.os,

      ipAddress: data.ip || '',
    });
    // =========================
    // GENERATE JWT
    // =========================

    const device: any = user.devices.find(
      (currentDevice: any) => currentDevice.deviceId === data.deviceId,
    );

    const tokens = await this.generateAuthTokens(
      user,
      data.deviceId,
    );

    if (device) {
      device.refreshToken = tokens.refreshTokenHash;

      device.refreshTokenExpiry = tokens.refreshTokenExpiry;

      device.lastSeen = new Date();
    }

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return {
      message: 'Login successful',

      token: tokens.accessToken,

      accessToken: tokens.accessToken,

      refreshToken: tokens.refreshToken,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: any;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userModel.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isBlocked || user.isDeleted) {
      throw new UnauthorizedException('Account restricted');
    }

    const device: any = user.devices.find(
      (currentDevice: any) =>
        currentDevice.deviceId === payload.deviceId,
    );

    if (!device || !device.refreshToken) {
      throw new UnauthorizedException('Device session expired');
    }

    if (
      !device.refreshTokenExpiry ||
      new Date() > device.refreshTokenExpiry
    ) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      device.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateAuthTokens(
      user,
      payload.deviceId,
    );

    device.refreshToken = tokens.refreshTokenHash;

    device.refreshTokenExpiry = tokens.refreshTokenExpiry;

    device.lastSeen = new Date();

    user.lastSeen = new Date();

    await user.save();

    return {
      message: 'Token refreshed successfully',

      token: tokens.accessToken,

      accessToken: tokens.accessToken,

      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userData: any) {
    const user = await this.userModel.findById(userData.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // REMOVE DEVICE
    user.devices = user.devices.filter(
      (device: any) => device.deviceId !== userData.deviceId,
    );

    await user.save();

    return {
      message: 'Logout successful',

      success: true,
    };
  }
}
