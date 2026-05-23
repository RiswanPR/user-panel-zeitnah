import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';

import * as crypto from 'crypto';

import axios from 'axios';

import { JwtService } from '@nestjs/jwt';

import { resend } from '../../config/resend.config';

import { User, UserDocument } from './schemas/user.schema';

import { LoginVerifyOtpDto } from './dto/login-verify-otp.dto';

import { RegisterSendOtpDto } from './dto/register-send-otp.dto';

import { RegisterVerifyOtpDto } from './dto/register-verify-otp.dto';
import { LoginHistoryService } from '../login-history/login-history.service';

type LoginDeviceSnapshot = {
  deviceId?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
};

type SuspiciousLoginResult = {
  isSuspicious: boolean;
  reasons: string[];
};

type LoginRequestMetadata = {
  ip: string;
  location: string;
};

const DEFAULT_SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function parseDurationToMs(value?: string | number | null): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const duration = (value || '').trim();

  if (!duration) {
    return null;
  }

  if (/^\d+$/.test(duration)) {
    const seconds = Number(duration);

    return seconds > 0 ? seconds * 1000 : null;
  }

  const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitToMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount > 0 ? amount * unitToMs[unit] : null;
}

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn =
    process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  private readonly refreshTokenExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  private readonly refreshTokenExpiryMs =
    Number(process.env.JWT_SESSION_EXPIRES_IN_MS) ||
    Number(process.env.JWT_REFRESH_EXPIRES_IN_MS) ||
    parseDurationToMs(this.refreshTokenExpiresIn) ||
    DEFAULT_SESSION_EXPIRY_MS;

  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private loginHistoryService: LoginHistoryService,
    private jwtService: JwtService,
  ) {}

  private normalizeSecurityValue(value?: string | null) {
    return (value || '').trim().toLowerCase();
  }

  private escapeHtml(value?: string | null) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private isPrivateOrLocalIp(ip?: string | null) {
    const value = (ip || '').trim().toLowerCase();

    if (!value) {
      return true;
    }

    if (
      value === '::1' ||
      value === 'localhost' ||
      value.startsWith('fe80:') ||
      value.startsWith('fc') ||
      value.startsWith('fd')
    ) {
      return true;
    }

    const ipv4 = value.startsWith('::ffff:')
      ? value.replace('::ffff:', '')
      : value;
    const parts = ipv4.split('.').map(Number);

    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
      return false;
    }

    const [first, second] = parts;

    return (
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254)
    );
  }

  private normalizeLocation(value?: string | null) {
    const location = (value || '').trim();

    return location && location.toLowerCase() !== 'unknown' ? location : '';
  }

  private async findLocationByIp(ip: string) {
    if (!ip || this.isPrivateOrLocalIp(ip)) {
      return '';
    }

    try {
      const response = await axios.get(
        `http://ip-api.com/json/${encodeURIComponent(ip)}`,
        {
          params: {
            fields: 'status,message,country,regionName,city,query',
          },
          timeout: 2500,
        },
      );

      if (response.data?.status !== 'success') {
        return '';
      }

      return [
        response.data.city,
        response.data.regionName,
        response.data.country,
      ]
        .filter(Boolean)
        .join(', ');
    } catch (error) {
      return '';
    }
  }

  private async findPublicIp() {
    try {
      const response = await axios.get('https://api.ipify.org', {
        params: {
          format: 'json',
        },
        timeout: 2500,
      });

      return typeof response.data?.ip === 'string'
        ? response.data.ip.trim()
        : '';
    } catch (error) {
      return '';
    }
  }

  private async resolveLoginMetadata(
    data: Pick<LoginVerifyOtpDto | RegisterVerifyOtpDto, 'ip' | 'location'>,
    requestIp: string,
  ): Promise<LoginRequestMetadata> {
    const clientIp = (data.ip || '').trim();
    const serverIp = (requestIp || '').trim();
    const publicIpFromServer = !this.isPrivateOrLocalIp(serverIp)
      ? serverIp
      : '';
    const publicIpFromClient = !this.isPrivateOrLocalIp(clientIp)
      ? clientIp
      : '';
    const ip =
      publicIpFromServer ||
      publicIpFromClient ||
      (await this.findPublicIp()) ||
      clientIp ||
      serverIp;

    const location =
      (await this.findLocationByIp(ip)) ||
      this.normalizeLocation(data.location) ||
      'Unknown';

    return {
      ip,
      location,
    };
  }

  private detectSuspiciousLogin(
    knownDevices: LoginDeviceSnapshot[],
    currentDevice: LoginDeviceSnapshot,
  ): SuspiciousLoginResult {
    const reasons: string[] = [];

    const currentDeviceId = this.normalizeSecurityValue(currentDevice.deviceId);
    const currentIp = this.normalizeSecurityValue(currentDevice.ip);
    const currentLocation = this.normalizeSecurityValue(currentDevice.location);
    const currentBrowser = this.normalizeSecurityValue(currentDevice.browser);
    const currentOs = this.normalizeSecurityValue(currentDevice.os);

    const previousDevices = knownDevices.filter((device) =>
      this.normalizeSecurityValue(device.deviceId),
    );

    if (!previousDevices.length) {
      return {
        isSuspicious: false,
        reasons,
      };
    }

    const matchingDevice = previousDevices.find(
      (device) =>
        this.normalizeSecurityValue(device.deviceId) === currentDeviceId,
    );

    if (!matchingDevice) {
      reasons.push('New device');
    }

    const knownIps = previousDevices
      .map((device) => this.normalizeSecurityValue(device.ip))
      .filter(Boolean);

    if (currentIp && knownIps.length && !knownIps.includes(currentIp)) {
      reasons.push('New IP address');
    }

    const knownLocations = previousDevices
      .map((device) => this.normalizeSecurityValue(device.location))
      .filter((location) => location && location !== 'unknown');

    if (
      currentLocation &&
      currentLocation !== 'unknown' &&
      knownLocations.length &&
      !knownLocations.includes(currentLocation)
    ) {
      reasons.push('New location');
    }

    if (matchingDevice) {
      if (
        currentBrowser &&
        this.normalizeSecurityValue(matchingDevice.browser) &&
        this.normalizeSecurityValue(matchingDevice.browser) !== currentBrowser
      ) {
        reasons.push('Browser changed');
      }

      if (
        currentOs &&
        this.normalizeSecurityValue(matchingDevice.os) &&
        this.normalizeSecurityValue(matchingDevice.os) !== currentOs
      ) {
        reasons.push('Operating system changed');
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  private async sendSuspiciousLoginEmail(
    user: UserDocument,
    loginDetails: LoginDeviceSnapshot,
    reasons: string[],
  ) {
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          'LMS Platform <onboarding@resend.dev>',

        to: user.email,

        subject: 'Suspicious login detected',

        html: `
          <div style="font-family:sans-serif">
            <h2>Suspicious login detected</h2>
            <p>
              We noticed a login to your LMS account that looked different from your usual activity.
            </p>
            <ul>
              ${reasons
                .map((reason) => `<li>${this.escapeHtml(reason)}</li>`)
                .join('')}
            </ul>
            <p><strong>Device:</strong> ${this.escapeHtml(loginDetails.deviceType || 'Unknown')}</p>
            <p><strong>Browser:</strong> ${this.escapeHtml(loginDetails.browser || 'Unknown')}</p>
            <p><strong>OS:</strong> ${this.escapeHtml(loginDetails.os || 'Unknown')}</p>
            <p><strong>IP:</strong> ${this.escapeHtml(loginDetails.ip || 'Unknown')}</p>
            <p><strong>Location:</strong> ${this.escapeHtml(loginDetails.location || 'Unknown')}</p>
            <p>
              If this was you, no action is needed. If this was not you, revoke unknown sessions and contact support immediately.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send suspicious login email', error);
    }
  }

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

      refreshTokenExpiry: new Date(Date.now() + this.refreshTokenExpiryMs),
    };
  }

  private isSessionExpired(device: any) {
    return (
      !device?.refreshTokenExpiry ||
      new Date() > new Date(device.refreshTokenExpiry)
    );
  }

  private removeExpiredSessions(user: UserDocument) {
    const initialSessionCount = user.devices.length;

    user.devices = user.devices.filter(
      (device: any) => !this.isSessionExpired(device),
    );

    return user.devices.length !== initialSessionCount;
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

    const loginMetadata = await this.resolveLoginMetadata(data, ip);
    const requestIp = loginMetadata.ip;
    const loginLocation = loginMetadata.location;

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

        ip: requestIp,

        location: loginLocation,

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

    const tokens = await this.generateAuthTokens(user, data.deviceId);

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

      ipAddress: requestIp,

      location: loginLocation,

      isSuspicious: false,

      suspiciousReasons: [],
    });
    return {
      message: 'Registration successful',

      token: tokens.accessToken,

      accessToken: tokens.accessToken,

      refreshToken: tokens.refreshToken,

      sessionExpiresAt: tokens.refreshTokenExpiry,

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

    const loginMetadata = await this.resolveLoginMetadata(data, ip);
    const requestIp = loginMetadata.ip;
    const loginLocation = loginMetadata.location;
    const knownDevices = [...user.devices];

    const suspiciousLogin = this.detectSuspiciousLogin(knownDevices, {
      deviceId: data.deviceId,
      deviceType: data.deviceType,
      browser: data.browser,
      os: data.os,
      ip: requestIp,
      location: loginLocation,
    });

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

        ip: requestIp,

        location: loginLocation,

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

      ipAddress: requestIp,

      location: loginLocation,

      isSuspicious: suspiciousLogin.isSuspicious,

      suspiciousReasons: suspiciousLogin.reasons,
    });

    if (suspiciousLogin.isSuspicious) {
      await this.sendSuspiciousLoginEmail(
        user,
        {
          deviceId: data.deviceId,
          deviceType: data.deviceType,
          browser: data.browser,
          os: data.os,
          ip: requestIp,
          location: loginLocation,
        },
        suspiciousLogin.reasons,
      );
    }
    // =========================
    // GENERATE JWT
    // =========================

    const device: any = user.devices.find(
      (currentDevice: any) => currentDevice.deviceId === data.deviceId,
    );

    const tokens = await this.generateAuthTokens(user, data.deviceId);

    if (device) {
      device.refreshToken = tokens.refreshTokenHash;

      device.refreshTokenExpiry = tokens.refreshTokenExpiry;

      device.lastSeen = new Date();

      device.ip = requestIp;

      device.location = loginLocation;

      device.browser = data.browser;

      device.os = data.os;
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

      sessionExpiresAt: tokens.refreshTokenExpiry,

      suspiciousLogin: suspiciousLogin.isSuspicious
        ? {
            detected: true,
            reasons: suspiciousLogin.reasons,
          }
        : {
            detected: false,
            reasons: [],
          },

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
      (currentDevice: any) => currentDevice.deviceId === payload.deviceId,
    );

    if (!device || !device.refreshToken) {
      throw new UnauthorizedException('Device session expired');
    }

    if (this.isSessionExpired(device)) {
      user.devices = user.devices.filter(
        (currentDevice: any) => currentDevice.deviceId !== payload.deviceId,
      );

      await user.save();

      throw new UnauthorizedException('Refresh token expired');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      device.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateAuthTokens(user, payload.deviceId);

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

      sessionExpiresAt: tokens.refreshTokenExpiry,
    };
  }

  async getActiveSessions(userData: any) {
    const user = await this.userModel.findById(userData.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const removedExpiredSessions = this.removeExpiredSessions(user);

    if (removedExpiredSessions) {
      await user.save();
    }

    const sessions = user.devices.map((device: any) => ({
      deviceId: device.deviceId,

      deviceType: device.deviceType || 'Unknown',

      browser: device.browser || 'Unknown browser',

      os: device.os || 'Unknown OS',

      ip: device.ip || '',

      location: device.location || 'Unknown',

      lastSeen: device.lastSeen,

      refreshTokenExpiry: device.refreshTokenExpiry,

      isCurrent: device.deviceId === userData.deviceId,
    }));

    return {
      success: true,

      sessions,
    };
  }

  async revokeSession(userData: any, deviceId: string) {
    const user = await this.userModel.findById(userData.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const existingDevice = user.devices.find(
      (device: any) => device.deviceId === deviceId,
    );

    if (!existingDevice) {
      throw new NotFoundException('Session not found');
    }

    user.devices = user.devices.filter(
      (device: any) => device.deviceId !== deviceId,
    );

    await user.save();

    return {
      success: true,

      revokedCurrentSession: deviceId === userData.deviceId,

      message: 'Session revoked successfully',
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
