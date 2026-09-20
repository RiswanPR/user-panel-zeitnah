import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserSkillDocument = UserSkill & Document;

export enum SkillProficiency {
  LEARNING = 'LEARNING',
  FAMILIAR = 'FAMILIAR',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum SkillSource {
  CLAIMED = 'CLAIMED',
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  PROJECT = 'PROJECT',
  ASSESSMENT = 'ASSESSMENT',
  CERTIFICATE = 'CERTIFICATE',
}

export enum SkillVisibility {
  PUBLIC = 'PUBLIC',
  NETWORK = 'NETWORK',
  PRIVATE = 'PRIVATE',
}

@Schema({ timestamps: true, collection: 'user_skills' })
export class UserSkill {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Skill', required: true, index: true })
  skillId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SkillProficiency),
    default: SkillProficiency.INTERMEDIATE,
  })
  proficiency!: SkillProficiency;

  @Prop({
    type: String,
    enum: Object.values(SkillSource),
    default: SkillSource.CLAIMED,
    index: true,
  })
  source!: SkillSource;

  @Prop({
    type: String,
    enum: Object.values(SkillVisibility),
    default: SkillVisibility.PUBLIC,
  })
  visibility!: SkillVisibility;
}

export const UserSkillSchema = SchemaFactory.createForClass(UserSkill);
UserSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });
UserSkillSchema.index({ userId: 1, source: 1 });
