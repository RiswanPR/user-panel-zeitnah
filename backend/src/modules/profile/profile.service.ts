import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  CommunityProfile,
  CommunityProfileDocument,
} from '../community/profile/schemas/community-profile.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  awardPoints,
  ensureGamification,
  PROFILE_COMPLETION_REWARDS,
  syncGamificationStats,
} from '../../common/gamification.helpers';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { UsernameService } from './services/username.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  USERNAME_CHANGE_COOLDOWN_DAYS,
  USERNAME_CHANGE_COOLDOWN_MS,
} from '../../common/constants/reserved-usernames';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(CommunityProfile.name)
    private communityProfileModel: Model<CommunityProfileDocument>,
    private uploadService: UploadService,
    private signedUrlService: SignedUrlService,
    private usernameService: UsernameService,
    private auditLogsService: AuditLogsService,
  ) {}

  // =========================================================================
  // USERNAME IDENTITY ENDPOINTS
  // =========================================================================

  /**
   * Retrieves the current user's username status, claim state, and cooldown details.
   */
  async getUsernameStatus(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('username usernameClaimed usernameChangedAt name');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let canChange = true;
    let nextAllowedDate: Date | null = null;
    let remainingDays = 0;

    if (user.usernameChangedAt) {
      const elapsed = Date.now() - new Date(user.usernameChangedAt).getTime();
      if (elapsed < USERNAME_CHANGE_COOLDOWN_MS) {
        canChange = false;
        const remainingMs = USERNAME_CHANGE_COOLDOWN_MS - elapsed;
        remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        nextAllowedDate = new Date(
          new Date(user.usernameChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS,
        );
      }
    }

    return {
      username: user.username || '',
      usernameClaimed: Boolean(user.usernameClaimed),
      usernameChangedAt: user.usernameChangedAt || null,
      canChange,
      remainingDays,
      nextAllowedDate,
      cooldownDays: USERNAME_CHANGE_COOLDOWN_DAYS,
    };
  }

  /**
   * Checks if a candidate username is valid and available to claim.
   */
  async checkAvailability(rawUsername: string, currentUserId?: string) {
    const sanitized = this.usernameService.sanitize(rawUsername);
    const validation = this.usernameService.validate(sanitized);

    if (!validation.valid) {
      return {
        username: sanitized,
        available: false,
        reason: validation.reason,
      };
    }

    // Check if the current user already owns this username
    if (currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId).select('username');
      if (currentUser?.username === sanitized) {
        return {
          username: sanitized,
          available: true,
          isCurrent: true,
        };
      }
    }

    const existingUser = await this.userModel.findOne({
      username: sanitized,
      ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
    }).select('_id');

    if (existingUser) {
      return {
        username: sanitized,
        available: false,
        reason: 'This username is already taken. Please choose another.',
      };
    }

    return {
      username: sanitized,
      available: true,
    };
  }

  /**
   * Performs the initial first-time username claim decision.
   * If already claimed, delegates to changeUsername.
   */
  async claimUsername(userId: string, requestedUsername: string, ipAddress = '') {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If username was already claimed previously, route to changeUsername
    if (user.usernameClaimed) {
      return this.changeUsername(userId, requestedUsername, ipAddress);
    }

    const sanitized = this.usernameService.sanitize(requestedUsername);
    const validation = this.usernameService.validate(sanitized);
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    // Check availability against other users
    const existing = await this.userModel.findOne({
      username: sanitized,
      _id: { $ne: user._id },
    });

    if (existing) {
      throw new ConflictException('Username is already taken. Please choose another.');
    }

    const previousUsername = user.username || '';

    let updatedUser: any;
    try {
      updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
          usernameClaimed: false,
        },
        {
          $set: {
            username: sanitized,
            usernameClaimed: true,
          },
        },
        { returnDocument: 'after' },
      );
    } catch (err: any) {
      if (err.code === 11000 || err.message?.includes('duplicate key')) {
        throw new ConflictException('Username is no longer available. Please choose another.');
      }
      throw err;
    }

    if (!updatedUser) {
      // Concurrent race condition occurred, user is now claimed
      return this.changeUsername(userId, requestedUsername, ipAddress);
    }

    // Synchronize CommunityProfile username if it exists
    await this.communityProfileModel.updateOne(
      { userId: String(user._id) },
      { $set: { username: sanitized } },
      { upsert: false },
    ).catch(() => {});

    // Record audit log event
    await this.auditLogsService.record({
      actor: user._id,
      action: 'USERNAME_CLAIMED',
      entityType: 'user',
      entityId: String(user._id),
      severity: 'info',
      ipAddress,
      message: `User claimed initial username @${sanitized}`,
      metadata: {
        username: sanitized,
        previousUsername,
      },
    });

    const userObj = updatedUser.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(userObj.avatar);
    }

    return {
      success: true,
      message: 'Username successfully claimed.',
      user: userObj,
    };
  }

  /**
   * Modifies an existing user's username subject to 14-day cooldown, validation, and uniqueness.
   */
  async changeUsername(userId: string, requestedUsername: string, ipAddress = '') {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sanitized = this.usernameService.sanitize(requestedUsername);
    const validation = this.usernameService.validate(sanitized);
    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    const previousUsername = user.username || '';

    // If handle is unchanged, return gracefully
    if (previousUsername && previousUsername.toLowerCase() === sanitized.toLowerCase()) {
      const userObj = user.toObject();
      if (userObj.avatar) {
        userObj.avatar = await this.signedUrlService.generateSignedImageUrl(userObj.avatar);
      }
      return {
        success: true,
        message: 'Username is unchanged.',
        user: userObj,
      };
    }

    // Enforce 14-day cooldown
    if (user.usernameChangedAt) {
      const elapsed = Date.now() - new Date(user.usernameChangedAt).getTime();
      if (elapsed < USERNAME_CHANGE_COOLDOWN_MS) {
        const remainingMs = USERNAME_CHANGE_COOLDOWN_MS - elapsed;
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        const nextAllowedDate = new Date(
          new Date(user.usernameChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS,
        );
        throw new BadRequestException(
          `You can change your username again in ${remainingDays} day${remainingDays === 1 ? '' : 's'} (after ${nextAllowedDate.toISOString().split('T')[0]}).`,
        );
      }
    }

    // Check availability against other users
    const existing = await this.userModel.findOne({
      username: sanitized,
      _id: { $ne: user._id },
    });

    if (existing) {
      throw new ConflictException('Username is already taken. Please choose another.');
    }

    const now = new Date();
    let updatedUser: any;
    try {
      updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          $set: {
            username: sanitized,
            usernameClaimed: true,
            usernameChangedAt: now,
          },
          $push: {
            usernameHistory: {
              username: previousUsername,
              changedAt: now,
            },
          },
        },
        { returnDocument: 'after' },
      );
    } catch (err: any) {
      if (err.code === 11000 || err.message?.includes('duplicate key')) {
        throw new ConflictException('Username is no longer available. Please choose another.');
      }
      throw err;
    }

    if (!updatedUser) {
      throw new UnauthorizedException('User not found');
    }

    // Synchronize CommunityProfile username if it exists
    await this.communityProfileModel.updateOne(
      { userId: String(user._id) },
      { $set: { username: sanitized } },
      { upsert: false },
    ).catch(() => {});

    // Record audit log event
    await this.auditLogsService.record({
      actor: user._id,
      action: 'USERNAME_CHANGED',
      entityType: 'user',
      entityId: String(user._id),
      severity: 'info',
      ipAddress,
      message: `User changed username from @${previousUsername} to @${sanitized}`,
      metadata: {
        newUsername: sanitized,
        previousUsername,
        changedAt: now,
      },
    });

    const userObj = updatedUser.toObject();
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(userObj.avatar);
    }

    return {
      success: true,
      message: 'Username updated successfully.',
      user: userObj,
    };
  }

  /**
   * Retrieves public student profile by username without exposing sensitive account fields.
   */
  async getPublicProfile(rawUsername: string) {
    const sanitized = this.usernameService.sanitize(rawUsername);
    const user = await this.userModel
      .findOne({ username: sanitized })
      .select('name username avatar bio skills role isVerified createdAt gamification');

    if (!user) {
      throw new NotFoundException(`Student profile @${sanitized} not found.`);
    }

    const userObj = user.toObject() as any;
    if (userObj.avatar) {
      userObj.avatar = await this.signedUrlService.generateSignedImageUrl(userObj.avatar);
    }

    return {
      user: {
        id: userObj._id,
        name: userObj.name,
        username: userObj.username,
        avatar: userObj.avatar,
        bio: userObj.bio,
        skills: userObj.skills || [],
        role: userObj.role,
        isVerified: Boolean(userObj.account_Status?.isVerified),
        createdAt: userObj.createdAt,
        gamification: {
          level: userObj.gamification?.level || 1,
          rank: userObj.gamification?.rank || 'Beginner',
          totalPoints: userObj.gamification?.totalPoints || 0,
          completedClasses: userObj.gamification?.completedClasses || 0,
          completedCourses: userObj.gamification?.completedCourses || 0,
          achievements: userObj.gamification?.achievements || [],
        },
      },
    };
  }

  // =========================================================================
  // CORE PROFILE OPERATIONS
  // =========================================================================

  // GET MY PROFILE
  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-otp -otpExpiry');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Ensure username is present if legacy account hasn't claimed one yet
    if (!user.username) {
      const candidates = this.usernameService.generateCandidates(user.name, user.email);
      for (const cand of candidates) {
        const exists = await this.userModel.exists({ username: cand });
        if (!exists) {
          user.username = cand;
          user.usernameClaimed = false;
          break;
        }
      }
      if (!user.username) {
        user.username = `user_${crypto.randomBytes(4).toString('hex')}`;
        user.usernameClaimed = false;
      }
      await user.save();
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

    // Synchronize shared fields to CommunityProfile if present
    await this.communityProfileModel.updateOne(
      { userId: String(user._id) },
      {
        $set: {
          bio: user.bio || '',
          skills: user.skills || [],
        },
      },
    ).catch(() => {});

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

    const extension = file.originalname.split('.').pop() || 'jpg';
    const key = `profiles/${userId}-${crypto.randomUUID()}.${extension}`;

    const oldAvatarKey = user.avatar;

    await this.uploadService.uploadFile(key, file.buffer, file.mimetype);

    user.avatar = key;
    await user.save();

    // Clean up old avatar from storage
    if (oldAvatarKey && oldAvatarKey !== key && oldAvatarKey.startsWith('profiles/')) {
      await this.uploadService.deleteFile(oldAvatarKey).catch(() => {});
    }

    const signedUrl = await this.signedUrlService.generateSignedImageUrl(key);

    // Sync to community profile picture
    await this.communityProfileModel.updateOne(
      { userId: String(user._id) },
      { $set: { profilePicture: signedUrl } },
    ).catch(() => {});

    return {
      message: 'Avatar uploaded successfully',
      avatar: signedUrl,
    };
  }
}
