import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { AuthenticatedUser } from '../auth/auth.service';
import { User, UserDocument } from '../../modules/auth/schemas/user.schema';

type JwtPayload = {
  userId: string;
  role: string;
  deviceId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          if (req && req.cookies) {
            return req.cookies.token || req.cookies.accessToken || null;
          }
          return null;
        },
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),

      ignoreExpiration: false,

      // ENV JWT SECRET
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // FIND USER
    const user = await this.userModel.findById(payload.userId);

    if (!user) {
      this.logAuthEvent('USER_NOT_FOUND', { userId: payload.userId, deviceId: payload.deviceId });
      throw new UnauthorizedException('User not found');
    }

    // BLOCKED ACCOUNT
    if (user.account_Status?.isBlocked || user.account_Status?.isDeleted) {
      this.logAuthEvent('ACCOUNT_RESTRICTED', { userId: payload.userId, deviceId: payload.deviceId });
      throw new UnauthorizedException('Account restricted');
    }

    // CHECK DEVICE SESSION
    const deviceExists = user.devices.find(
      (device) => device.deviceId === payload.deviceId,
    );

    // DEVICE REMOVED
    if (!deviceExists) {
      this.logAuthEvent('DEVICE_SESSION_EXPIRED', { userId: payload.userId, deviceId: payload.deviceId, reason: 'Device not found in user devices' });
      throw new UnauthorizedException('Device session expired');
    }

    if (
      !deviceExists.refreshTokenExpiry ||
      new Date() > new Date(deviceExists.refreshTokenExpiry)
    ) {
      await this.userModel.updateOne(
        {
          _id: payload.userId,
        },
        {
          $pull: {
            devices: {
              deviceId: payload.deviceId,
            },
          },
        },
      );

      this.logAuthEvent('SESSION_EXPIRED', { userId: payload.userId, deviceId: payload.deviceId, reason: 'Refresh token expiry exceeded' });
      throw new UnauthorizedException('Session expired');
    }

    // UPDATE LAST SEEN (Throttled to once every 5 minutes to prevent DB write contention)
    const now = Date.now();
    const lastSeenTime = deviceExists.lastSeen
      ? new Date(deviceExists.lastSeen).getTime()
      : 0;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    if (now - lastSeenTime > FIVE_MINUTES_MS) {
      await this.userModel.updateOne(
        {
          _id: payload.userId,
          'devices.deviceId': payload.deviceId,
        },
        {
          $set: {
            'devices.$.lastSeen': new Date(now),
            'account_Status.lastSeen': new Date(now),
          },
        },
      );
    }

    return {
      userId: payload.userId,

      name: user.name,
      email: user.email,
      username: user.username,
      usernameClaimed: user.usernameClaimed ?? false,
      usernameChangedAt: user.usernameChangedAt || null,

      role: payload.role,

      deviceId: payload.deviceId,
    };
  }

  private logAuthEvent(stage: string, details: Record<string, unknown> = {}): void {
    const entry = {
      event: 'AUTH_GUARD',
      stage,
      timestamp: new Date().toISOString(),
      ...details,
    };
    this.logger.warn(JSON.stringify(entry));
  }
}
