import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommunityProfile,
  CommunityProfileDocument,
  AchievementLog,
  AchievementLogDocument,
} from '../schemas/profile.schema';

@Injectable()
export class CommunityGamificationService {
  private readonly logger = new Logger(CommunityGamificationService.name);

  constructor(
    @InjectModel(CommunityProfile.name)
    private profileModel: Model<CommunityProfileDocument>,
    @InjectModel(AchievementLog.name)
    private achievementLogModel: Model<AchievementLogDocument>,
  ) {}

  async getProfile(userId: string): Promise<CommunityProfileDocument> {
    let profile = await this.profileModel.findOne({ userId });
    if (!profile) {
      profile = new this.profileModel({ userId });
      await profile.save();
    }
    return profile;
  }

  async addXp(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ levelUp: boolean; newLevel: number }> {
    const profile = await this.getProfile(userId);

    profile.xp += amount;
    profile.score += amount; // We can weight this differently later

    const oldLevel = profile.level;
    // Simple leveling curve: Level = floor(sqrt(XP / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(profile.xp / 100)) + 1;

    let levelUp = false;
    if (newLevel > oldLevel) {
      profile.level = newLevel;
      levelUp = true;
      this.logger.log(`User ${userId} leveled up to ${newLevel}`);
      // Based on level, maybe assign rank
      profile.rank = this.getRankForLevel(newLevel);
    }

    profile.lastActivityDate = new Date();
    await profile.save();

    return { levelUp, newLevel };
  }

  async awardAchievement(
    userId: string,
    achievementId: string,
    name: string,
    xpRewarded: number = 0,
  ): Promise<void> {
    const profile = await this.getProfile(userId);

    // Check if already awarded
    const exists = await this.achievementLogModel.findOne({
      userId,
      achievementId,
    });
    if (exists) return;

    const log = new this.achievementLogModel({
      userId,
      achievementId,
      name,
      xpRewarded,
    });
    await log.save();

    if (xpRewarded > 0) {
      await this.addXp(userId, xpRewarded, `Achievement: ${name}`);
    }
  }

  async updateStreak(userId: string): Promise<void> {
    const profile = await this.getProfile(userId);
    const now = new Date();
    const lastActivity = profile.lastActivityDate;

    const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.highestStreak) {
        profile.highestStreak = profile.currentStreak;
      }
    } else if (diffDays > 1) {
      profile.currentStreak = 1; // Reset
    }
    // if diffDays == 0 (same day), do nothing to streak

    profile.lastActivityDate = now;
    await profile.save();
  }

  private getRankForLevel(level: number): string {
    if (level < 5) return 'Novice';
    if (level < 15) return 'Contributor';
    if (level < 30) return 'Expert';
    if (level < 50) return 'Master';
    return 'Legend';
  }
}
