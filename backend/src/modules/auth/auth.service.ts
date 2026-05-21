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

import { VerifyOtpDto } from './dto/verify-otp.dto';



@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private jwtService: JwtService,
  ) {}

  // SEND OTP
  async sendOtp(email: string) {
    const user = await this.userModel.findOne({
      email,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate Secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP
    const hashedOtp = await bcrypt.hash(otp, 10);

    // OTP Expiry = 5 Minutes
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

        subject: 'Your OTP Code',

        html: `
          <div style="font-family:sans-serif">
            <h2>Your OTP Code</h2>

            <h1>${otp}</h1>

            <p>
              OTP valid for 5 minutes
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

  // VERIFY OTP
  async verifyOtp(data: VerifyOtpDto) {
    const user = await this.userModel.findOne({
      email: data.email,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check OTP Expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throw new UnauthorizedException('OTP expired');
    }

    // Compare OTP
    if (!user.otp) {
      throw new UnauthorizedException('OTP not found');
    }

    const isOtpValid = await bcrypt.compare(data.otp, user.otp);
    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Generate JWT Token
    const token = this.jwtService.sign({
      userId: user._id,

      role: user.role,
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
