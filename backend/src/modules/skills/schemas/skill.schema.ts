import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SkillDocument = Skill & Document;

export enum SkillStatus {
  ACTIVE = 'ACTIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  DEPRECATED = 'DEPRECATED',
}

@Schema({ timestamps: true, collection: 'skills' })
export class Skill {
  @Prop({ required: true, trim: true, unique: true, index: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true, default: 'General', index: true })
  category!: string;

  @Prop({ type: [String], default: [] })
  aliases!: string[];

  @Prop({
    type: String,
    enum: Object.values(SkillStatus),
    default: SkillStatus.ACTIVE,
    index: true,
  })
  status!: SkillStatus;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);
SkillSchema.index({ name: 'text', aliases: 'text' });
