import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  User,
  UserDocument,
} from '../auth/schemas/user.schema';

import {
  UpdateProfileDto,
} from './dto/update-profile.dto';
import {
  awardPoints,
  ensureGamification,
  PROFILE_COMPLETION_REWARDS,
  syncGamificationStats,
} from '../../common/gamification.helpers';

@Injectable()

export class ProfileService {

  constructor(

    @InjectModel(User.name)
    private userModel:
      Model<UserDocument>,

  ) {}

  // GET MY PROFILE
  async getMe(
    userId: string,
  ) {

    const user =
      await this.userModel
        .findById(userId)
        .select('-otp -otpExpiry');

    if (!user) {

      throw new UnauthorizedException(
        'User not found',
      );

    }

    syncGamificationStats(user);
    user.markModified('gamification');
    await user.save();

    return {

      user,

    };

  }

  // UPDATE PROFILE
  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
  ) {

    const user =
      await this.userModel.findById(
        userId,
      );

    if (!user) {

      throw new UnauthorizedException(
        'User not found',
      );

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

    return {

      message:
        'Profile updated successfully',

      user,

    };

  }

}
