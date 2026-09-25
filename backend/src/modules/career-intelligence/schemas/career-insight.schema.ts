import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CareerInsightDocument = CareerInsight & Document;

export enum ProfileStrengthLevel {
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  EMERGING = 'EMERGING',
}

export enum RoleAlignmentLevel {
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  EMERGING = 'EMERGING',
}

export enum EvidenceType {
  EXPLICIT_SKILL = 'EXPLICIT_SKILL',
  PROJECT_EVIDENCE = 'PROJECT_EVIDENCE',
  EXPERIENCE_EVIDENCE = 'EXPERIENCE_EVIDENCE',
  SOFTWARE_PROFICIENCY = 'SOFTWARE_PROFICIENCY',
  COURSE_EVIDENCE = 'COURSE_EVIDENCE',
  CERTIFICATION_EVIDENCE = 'CERTIFICATION_EVIDENCE',
}

export enum SkillConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  EMERGING = 'EMERGING',
}

export interface DemonstratedSkillEvidence {
  skill: string;
  evidenceType: EvidenceType;
  confidence: SkillConfidence;
  source: string;
}

export interface SkillGapItem {
  skill: string;
  status: 'NOT_DEMONSTRATED';
  importance: 'REQUIRED' | 'PREFERRED';
  recommendedAction: string;
}

export interface TargetRoleSkillGaps {
  targetRole: string;
  demonstratedSkills: DemonstratedSkillEvidence[];
  gapSkills: SkillGapItem[];
}

export interface RoleAlignmentItem {
  roleId: string;
  roleTitle: string;
  discipline: string;
  alignmentLevel: RoleAlignmentLevel;
  alignmentScore: number; // 0–100
  demonstratedReasons: string[];
  developmentGaps: string[];
  relevantJobCount: number;
}

export interface CareerPathwayStep {
  stepNumber: number;
  title: string;
  description: string;
  skillType: string;
  actionItem: string;
}

export interface TargetRolePathway {
  targetRole: string;
  steps: CareerPathwayStep[];
}

export interface ProfileRecommendationItem {
  title: string;
  description: string;
  category:
    | 'EXPERIENCE'
    | 'SOFTWARE'
    | 'PROJECTS'
    | 'CERTIFICATIONS'
    | 'CAREER_PREFERENCES'
    | 'SKILLS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionType: string;
}

export interface ProfileStrengthEvidenceItem {
  label: string;
  verified: boolean;
  note: string;
  iconType: string;
}

@Schema({ timestamps: true, collection: 'career_insights' })
export class CareerInsight {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  profileVersion!: number;

  @Prop({ type: String, default: 'v1' })
  analysisVersion!: string;

  @Prop({ type: String, default: 'v1' })
  taxonomyVersion!: string;

  @Prop({
    type: String,
    enum: ['ACTIVE', 'STALE'],
    default: 'ACTIVE',
    index: true,
  })
  status!: 'ACTIVE' | 'STALE';

  // Profile Completeness (0–100% of filled fields)
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  profileCompleteness!: number;

  // Profile Strength (Depth of verifiable domain capabilities)
  @Prop({
    type: String,
    enum: Object.values(ProfileStrengthLevel),
    required: true,
  })
  profileStrength!: ProfileStrengthLevel;

  @Prop({ type: [Object], default: [] })
  profileStrengthEvidence!: ProfileStrengthEvidenceItem[];

  @Prop({
    type: {
      currentPosition: { type: String, default: '' },
      primaryDiscipline: { type: String, default: '' },
      strongAreas: { type: [String], default: [] },
      yearsOfExperience: { type: Number, default: 0 },
      keySoftware: { type: [String], default: [] },
      targetRoles: { type: [String], default: [] },
    },
    default: {},
  })
  careerSummary!: {
    currentPosition: string;
    primaryDiscipline: string;
    strongAreas: string[];
    yearsOfExperience: number;
    keySoftware: string[];
    targetRoles: string[];
  };

  @Prop({ type: String, default: '' })
  primaryTargetRole!: string;

  @Prop({ type: [String], default: [] })
  secondaryTargetRoles!: string[];

  @Prop({ type: [Object], default: [] })
  roleAlignments!: RoleAlignmentItem[];

  @Prop({ type: [Object], default: [] })
  skillGaps!: TargetRoleSkillGaps[];

  @Prop({ type: [Object], default: [] })
  skillPathways!: TargetRolePathway[];

  @Prop({ type: [Object], default: [] })
  profileRecommendations!: ProfileRecommendationItem[];

  @Prop({ type: Date, default: Date.now, index: true })
  generatedAt!: Date;
}

export const CareerInsightSchema = SchemaFactory.createForClass(CareerInsight);

CareerInsightSchema.index({ userId: 1, status: 1 });
