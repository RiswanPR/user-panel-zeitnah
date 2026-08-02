import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ExperienceDocument = Experience & Document;

@Schema({ timestamps: true, collection: 'community_experiences' })
export class Experience {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, trim: true })
  company: string;

  @Prop({ type: String, required: true, trim: true })
  role: string;

  @Prop({ type: String, default: '' })
  location: string;

  @Prop({ type: String, default: 'Full-time' })
  employmentType: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate?: Date;

  @Prop({ type: Boolean, default: false })
  isCurrent: boolean;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  skillsUsed: string[];
}

export const ExperienceSchema = SchemaFactory.createForClass(Experience);
ExperienceSchema.index({ userId: 1, startDate: -1 });
