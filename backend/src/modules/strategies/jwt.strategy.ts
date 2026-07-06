import { Injectable, UnauthorizedException } from '@nestjs/common';

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
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      // ENV JWT SECRET
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // FIND USER
    const user = await this.userModel.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // BLOCKED ACCOUNT
    if (user.account_Status?.isBlocked || user.account_Status?.isDeleted) {
      throw new UnauthorizedException('Account restricted');
    }

    // CHECK DEVICE SESSION
    const deviceExists = user.devices.find(
      (device) => device.deviceId === payload.deviceId,
    );

    // DEVICE REMOVED
    if (!deviceExists) {
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

      throw new UnauthorizedException('Session expired');
    }

    // UPDATE LAST SEEN
    await this.userModel.updateOne(
      {
        _id: payload.userId,
        'devices.deviceId': payload.deviceId,
      },
      {
        $set: {
          'devices.$.lastSeen': new Date(),
          'account_Status.lastSeen': new Date(),
        },
      },
    );

    return {
      userId: payload.userId,

      name: user.name,

      role: payload.role,

      deviceId: payload.deviceId,
    };
  }
}
