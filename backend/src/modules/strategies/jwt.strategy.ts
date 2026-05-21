import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { User, UserDocument } from '../../modules/auth/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: 'SECRET_KEY',
    });
  }

  async validate(payload: any) {
    // FIND USER
    const user = await this.userModel.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // CHECK DEVICE SESSION
    const deviceExists = user.devices.find(
      (device) => device.deviceId === payload.deviceId,
    );

    // DEVICE REMOVED
    if (!deviceExists) {
      throw new UnauthorizedException('Device session expired');
    }

    return {
      userId: payload.userId,

      role: payload.role,
    };
  }
}
