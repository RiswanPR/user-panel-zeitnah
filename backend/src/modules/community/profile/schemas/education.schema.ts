import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type EducationDocument = Education & Document;

@Schema({ timestamps: true, collection: 'community_educations' })
export class Education {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, trim: true })
  institution: string;

  @Prop({ type: String, required: true, trim: true })
  degree: string;

  @Prop({ type: String, default: '' })
  fieldOfStudy: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate?: Date;

  @Prop({ type: String, default: '' })
  grade: string;

  @Prop({ type: String, default: '' })
  activities: string;
}

export const EducationSchema = SchemaFactory.createForClass(Education);
EducationSchema.index({ userId: 1, startDate: -1 });
