import { Injectable, UnauthorizedException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { User, UserDocument } from '../auth/schemas/user.schema';

import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  awardPoints,
  ensureGamification,
  PROFILE_COMPLETION_REWARDS,
  syncGamificationStats,
} from '../../common/gamification.helpers';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import * as crypto from 'crypto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private uploadService: UploadService,
    private signedUrlService: SignedUrlService,
  ) {}

  // GET MY PROFILE
  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-otp -otpExpiry');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    const userObj = user.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }

    return {
      user: userObj,
    };
  }

  // UPDATE PROFILE
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (data.name !== undefined) {
      user.name = data.name;
    }

    if (data.bio !== undefined) {
      user.bio = data.bio;
    }

    if (data.avatar !== undefined) {
      user.avatar = data.avatar;
    }

    if (data.skills !== undefined) {
      user.skills = data.skills;
    }

    const gamification = ensureGamification(user);

    syncGamificationStats(user);

    PROFILE_COMPLETION_REWARDS.forEach((reward) => {
      if (
        user.gamification.profileCompletion >= reward.milestone &&
        !gamification.profileCompletionRewards.includes(reward.milestone)
      ) {
        gamification.profileCompletionRewards.push(reward.milestone);
        awardPoints(
          user,
          reward.points,
          `${reward.milestone}% Profile Complete`,
          'profile_completion',
          {
            milestone: reward.milestone,
          },
        );
      }
    });

    syncGamificationStats(user);
    user.markModified('gamification');

    await user.save();

    const userObj = user.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(
        userObj.avatar,
      );
    }

    return {
      message: 'Profile updated successfully',

      user: userObj,
    };
  }

  // UPLOAD AVATAR
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const extension = file.originalname.split('.').pop();
    const key = `profiles/${userId}-${crypto.randomUUID()}.${extension}`;

    await this.uploadService.uploadFile(key, file.buffer, file.mimetype);

    user.avatar = key;
    await user.save();

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(key);

    return {
      message: 'Avatar uploaded successfully',
      avatar: signedUrl,
    };
  }
}
