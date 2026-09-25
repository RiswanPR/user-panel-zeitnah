import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobTalentMatchDocument = JobTalentMatch & Document;

export enum MatchCategory {
  HIGHLY_COMPATIBLE = 'HIGHLY_COMPATIBLE',
  STRONGLY_COMPATIBLE = 'STRONGLY_COMPATIBLE',
  POTENTIALLY_COMPATIBLE = 'POTENTIALLY_COMPATIBLE',
}

export enum MatchStatus {
  ACTIVE = 'ACTIVE',
  STALE = 'STALE',
  INVALIDATED = 'INVALIDATED',
}

export interface HardRequirementFailure {
  type: string; // 'experience' | 'discipline' | 'certification' | 'skill' | 'software' | 'education'
  expected: string | number;
  actual: string | number;
}

export interface MatchDimensionScore {
  dimension: string;
  score: number; // 0–100
  weight: number;
  matchedItems?: string[];
  missingItems?: string[];
  note?: string;
}

@Schema({ timestamps: true, collection: 'job_talent_matches' })
export class JobTalentMatch {
  @Prop({ type: Types.ObjectId, ref: 'Opportunity', required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateUserId!: Types.ObjectId;

  // Overall compatibility score (0–100)
  @Prop({ type: Number, required: true, min: 0, max: 100, index: true })
  score!: number;

  // Categorized match tier
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

  // Strong match reasons (for explanation UI)
  @Prop({ type: [String], default: [] })
  matchReasons!: string[];

  // Potential gap reasons
  @Prop({ type: [String], default: [] })
  gapReasons!: string[];

  // Hard requirement failures (candidates who fail mandatory requirements)
  @Prop({ type: [Object], default: [] })
  hardRequirementFailures!: HardRequirementFailure[];

  // Whether all hard requirements are passed
  @Prop({ type: Boolean, default: true })
  passesHardRequirements!: boolean;

  // Matched structured data
  @Prop({ type: [String], default: [] })
  matchedSkills!: string[];

  @Prop({ type: [String], default: [] })
  matchedSoftware!: string[];

  @Prop({ type: [String], default: [] })
  matchedSectors!: string[];

  @Prop({ type: [String], default: [] })
  matchedProjects!: string[];

  // Match status for cache invalidation
  @Prop({
    type: String,
    enum: Object.values(MatchStatus),
    default: MatchStatus.ACTIVE,
    index: true,
  })
  status!: MatchStatus;

  // Recruiter actions on matched candidate
  @Prop({ type: Boolean, default: false, index: true })
  isSaved!: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDismissed!: boolean;

  // Algorithm/model version for traceability
  @Prop({ type: String, required: true, default: 'v1' })
  matchingEngineVersion!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  calculatedAt!: Date;
}

export const JobTalentMatchSchema = SchemaFactory.createForClass(JobTalentMatch);

// Compound unique index: one match per candidate per job
JobTalentMatchSchema.index(
  { jobId: 1, candidateUserId: 1 },
  { unique: true },
);

// Efficient recruiter queries: active matches for a job, sorted by score
JobTalentMatchSchema.index({ jobId: 1, status: 1, isDismissed: 1, score: -1 });

// Invalidation queries: find matches for a candidate across jobs
JobTalentMatchSchema.index({ candidateUserId: 1, status: 1 });

// Business-level queries
JobTalentMatchSchema.index({ businessId: 1, jobId: 1 });
