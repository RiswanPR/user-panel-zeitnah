import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  PassportStrategy,
} from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  User,
  UserDocument,
} from '../../modules/auth/schemas/user.schema';

@Injectable()

export class JwtStrategy extends PassportStrategy(
  Strategy,
) {

  constructor(

    @InjectModel(User.name)

    private userModel:
      Model<UserDocument>,

  ) {

    super({

      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      // ENV JWT SECRET
      secretOrKey:
        process.env.JWT_SECRET!,

    });

  }

  async validate(payload: any) {

    // FIND USER
    const user =
      await this.userModel.findById(
        payload.userId,
      );

    if (!user) {

      throw new UnauthorizedException(
        'User not found',
      );

    }

    // BLOCKED ACCOUNT
    if (
      user.isBlocked ||
      user.isDeleted
    ) {

      throw new UnauthorizedException(
        'Account restricted',
      );

    }

    // CHECK DEVICE SESSION
    const deviceExists: any =
      user.devices.find(
        (device: any) =>
          device.deviceId ===
          payload.deviceId,
      );

    // DEVICE REMOVED
    if (!deviceExists) {

      throw new UnauthorizedException(
        'Device session expired',
      );

    }

    if (
      !deviceExists.refreshTokenExpiry ||
      new Date() > new Date(deviceExists.refreshTokenExpiry)
    ) {
      user.devices = user.devices.filter(
        (device: any) =>
          device.deviceId !==
          payload.deviceId,
      );

      await user.save();

      throw new UnauthorizedException(
        'Session expired',
      );

    }

    // UPDATE LAST SEEN
    deviceExists.lastSeen =
      new Date();

    user.lastSeen =
      new Date();

    await user.save();

    return {

      userId:
        payload.userId,

      name:
        user.name,

      role:
        payload.role,

      deviceId:
        payload.deviceId,

    };

  }

}
