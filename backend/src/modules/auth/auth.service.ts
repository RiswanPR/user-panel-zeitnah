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

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private jwtService: JwtService,
  ) {}

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
async registerVerifyOtp(
  data: RegisterVerifyOtpDto,
) {

  const user =
    await this.userModel.findOne({
      email: data.email,
    });

  if (!user) {

    throw new UnauthorizedException(
      'User not found',
    );

  }

  // CHECK OTP EXPIRY
  if (
    !user.otpExpiry ||
    new Date() > user.otpExpiry
  ) {

    throw new UnauthorizedException(
      'OTP expired',
    );

  }

  // CHECK OTP EXISTS
  if (!user.otp) {

    throw new UnauthorizedException(
      'OTP not found',
    );

  }

  // VERIFY OTP
  const isOtpValid =
    await bcrypt.compare(
      data.otp,
      user.otp,
    );

  if (!isOtpValid) {

    throw new UnauthorizedException(
      'Invalid OTP',
    );

  }

  // =========================
  // DEVICE LIMIT SYSTEM
  // =========================

  const existingDevice =
    user.devices.find(
      (device) =>
        device.deviceId ===
        data.deviceId
    );

  // NEW DEVICE
  if (!existingDevice) {

    // CHECK SAME DEVICE TYPE
    const sameTypeDevice =
      user.devices.find(
        (device) =>
          device.deviceType ===
          data.deviceType
      );

    // ASK REPLACEMENT
    if (sameTypeDevice) {

      if (!data.forceLogin) {

        return {

          replaceDevice: true,

          message:
            `Another ${data.deviceType} device is already logged in`,

        };

      }

      // REMOVE OLD DEVICE
      user.devices =
        user.devices.filter(
          (device) =>
            device.deviceType !==
            data.deviceType
        );

    }

    // MAX 2 DEVICES
    if (
      user.devices.length >= 2
    ) {

      throw new UnauthorizedException(
        'Device limit exceeded',
      );

    }

    // ADD DEVICE
    user.devices.push({

      deviceId:
        data.deviceId,

      deviceType:
        data.deviceType,

    });

  }

  // CLEAR OTP
  user.otp = null;

  user.otpExpiry = null;

  // DEFAULT VERIFICATION STATUS
  user.isVerified = false;

  await user.save();

  // GENERATE JWT
  const token =
    this.jwtService.sign({

      userId: user._id,

      role: user.role,

      deviceId:
        data.deviceId,

    });

  return {

    message:
      'Registration successful',

    token,

    user: {

      id: user._id,

      name: user.name,

      email: user.email,

      role: user.role,

      userVerification:
        user.isVerified,

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
  async loginVerifyOtp(data: LoginVerifyOtpDto) {
    const user = await this.userModel.findOne({
      email: data.email,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
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

    const existingDevice = user.devices.find(
      (device) => device.deviceId === data.deviceId,
    );

    // NEW DEVICE
    if (!existingDevice) {
      // CHECK SAME DEVICE TYPE
      const sameTypeDevice = user.devices.find(
        (device) => device.deviceType === data.deviceType,
      );

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
          (device) => device.deviceType !== data.deviceType,
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
      });
    }
    // =========================
    // GENERATE JWT
    // =========================

    const token = this.jwtService.sign({
      userId: user._id,

      role: user.role,

      deviceId: data.deviceId,
    });
    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    return {
      message: 'Login successful',

      token,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,
      },
    };
  }
}
