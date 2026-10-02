import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommunityProfileDocument = CommunityProfile & Document;
export type AchievementLogDocument = AchievementLog & Document;

@Schema({ timestamps: true, collection: 'community_profiles' })
export class CommunityProfile {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, unique: true })
  userId: string;

  @Prop({ type: Number, default: 0 })
  score: number;

  @Prop({ type: Number, default: 0 })
  xp: number;

  @Prop({ type: Number, default: 1 })
  level: number;

  @Prop({ type: String, default: 'Novice' })
  rank: string;

  @Prop({ type: [String], default: [] })
  badges: string[]; // e.g., 'helpful', 'top-contributor'

  @Prop({ type: Number, default: 0 })
  currentStreak: number;

  @Prop({ type: Number, default: 0 })
  highestStreak: number;

  @Prop({ type: Date, default: Date.now })
  lastActivityDate: Date;
}
export const CommunityProfileSchema =
  SchemaFactory.createForClass(CommunityProfile);

@Schema({ timestamps: true, collection: 'community_achievement_logs' })
export class AchievementLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  achievementId: string; // e.g., 'first_post', '7_day_streak'

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, default: 0 })
  xpRewarded: number;
}
export const AchievementLogSchema =
  SchemaFactory.createForClass(AchievementLog);
