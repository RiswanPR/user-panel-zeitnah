import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type SkillDocument = Skill & Document;

export enum ProficiencyLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  EXPERT = 'Expert',
}

@Schema({ timestamps: true, collection: 'community_skills' })
export class Skill {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  name: string;

  @Prop({ type: String, default: 'General' })
  category: string;

  @Prop({
    type: String,
    enum: Object.values(ProficiencyLevel),
    default: ProficiencyLevel.INTERMEDIATE,
  })
  proficiencyLevel: ProficiencyLevel;

  @Prop({ type: Number, default: 0 })
  endorsementsCount: number;

  @Prop({ type: [String], default: [] })
  endorsedBy: string[];
}

export const SkillSchema = SchemaFactory.createForClass(Skill);
SkillSchema.index({ userId: 1, name: 1 }, { unique: true });
