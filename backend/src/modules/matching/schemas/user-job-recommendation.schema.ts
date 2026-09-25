import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  MatchCategory,
  MatchStatus,
  MatchDimensionScore,
  HardRequirementFailure,
} from './job-talent-match.schema';

export type UserJobRecommendationDocument = UserJobRecommendation & Document;

export enum RecommendationFeedback {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  NONE = 'NONE',
}

export enum RecommendationType {
  ROLE_MATCH = 'role_match',
  SKILL_MATCH = 'skill_match',
  SECTOR_MATCH = 'sector_match',
  SOFTWARE_MATCH = 'software_match',
  PROJECT_MATCH = 'project_match',
  LOCATION_MATCH = 'location_match',
  CAREER_PREFERENCE_MATCH = 'career_preference_match',
  NEW_RELEVANT_JOB = 'new_relevant_job',
}

@Schema({ timestamps: true, collection: 'user_job_recommendations' })
export class UserJobRecommendation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Opportunity', required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  businessId!: Types.ObjectId;

  // Compatibility score (0–100)
  @Prop({ type: Number, required: true, min: 0, max: 100, index: true })
  compatibilityScore!: number;

  // Match tier category
  @Prop({
    type: String,
    enum: Object.values(MatchCategory),
    required: true,
    index: true,
  })
  category!: MatchCategory;

  // Per-dimension scoring breakdown
  @Prop({ type: [Object], default: [] })
  dimensionScores!: MatchDimensionScore[];

  // Data-grounded positive reasons for recommendation
  @Prop({ type: [String], default: [] })
  matchReasons!: string[];

  // Data-grounded potential gap reasons
  @Prop({ type: [String], default: [] })
  gapReasons!: string[];

  // Hard requirement failure details (if any)
  @Prop({ type: [Object], default: [] })
  hardRequirementFailures!: HardRequirementFailure[];

  // Whether all mandatory requirements were passed
  @Prop({ type: Boolean, default: true, index: true })
  passesHardRequirements!: boolean;

  @Prop({ type: [String], default: [] })
  matchedSkills!: string[];

  @Prop({ type: [String], default: [] })
  matchedSoftware!: string[];

  @Prop({ type: [String], default: [] })
  matchedSectors!: string[];

  @Prop({ type: [String], default: [] })
  matchedProjects!: string[];

  // Multi-label reasons why this job was surfaced
  @Prop({ type: [String], default: [] })
  recommendationTypes!: string[];

  // User-side actions & state
  @Prop({ type: Boolean, default: false, index: true })
  isSaved!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isHidden!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDismissed!: boolean;

  @Prop({
    type: String,
    enum: Object.values(RecommendationFeedback),
    default: RecommendationFeedback.NONE,
  })
  feedback!: RecommendationFeedback;

  // Invalidation status
  @Prop({
    type: String,
    enum: Object.values(MatchStatus),
    default: MatchStatus.ACTIVE,
    index: true,
  })
  status!: MatchStatus;

  @Prop({ type: String, default: 'v1' })
  modelVersion!: string;

  @Prop({ type: Date, default: Date.now })
  calculatedAt!: Date;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const UserJobRecommendationSchema = SchemaFactory.createForClass(
  UserJobRecommendation,
);

// Compound uniqueness: one recommendation per (user, job) pair
UserJobRecommendationSchema.index(
  { userId: 1, jobId: 1 },
  { unique: true },
);

// High performance index for candidate feed queries
UserJobRecommendationSchema.index(
  {
    userId: 1,
    status: 1,
    isHidden: 1,
    isDismissed: 1,
    passesHardRequirements: 1,
    compatibilityScore: -1,
  },
);

UserJobRecommendationSchema.index({ jobId: 1, status: 1 });
