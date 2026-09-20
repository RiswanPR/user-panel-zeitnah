import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SkillProofDocument = SkillProof & Document;

export enum ProofSourceType {
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  PROJECT = 'PROJECT',
  CERTIFICATE = 'CERTIFICATE',
  ASSESSMENT = 'ASSESSMENT',
  PORTFOLIO = 'PORTFOLIO',
  WORK_EXPERIENCE = 'WORK_EXPERIENCE',
  COMMUNITY_CONTRIBUTION = 'COMMUNITY_CONTRIBUTION',
}

export enum ProofStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true, collection: 'skill_proofs' })
export class SkillProof {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Skill', required: true, index: true })
  skillId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ProofSourceType),
    required: true,
    index: true,
  })
  sourceType!: ProofSourceType;

  @Prop({ type: String, required: true })
  sourceId!: string;

  @Prop({
    type: String,
    enum: Object.values(ProofStatus),
    default: ProofStatus.VERIFIED,
    index: true,
  })
  status!: ProofStatus;

  @Prop({ type: Date, default: Date.now })
  verifiedAt!: Date;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>;
}

export const SkillProofSchema = SchemaFactory.createForClass(SkillProof);
SkillProofSchema.index({ userId: 1, skillId: 1, sourceType: 1, sourceId: 1 }, { unique: true });
