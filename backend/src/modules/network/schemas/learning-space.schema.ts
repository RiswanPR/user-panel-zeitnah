import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LearningSpaceDocument = LearningSpace & Document;

@Schema({ timestamps: true, collection: 'learning_spaces' })
export class LearningSpace {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, default: '', trim: true })
  description: string;

  @Prop({ type: String, default: 'Batch', enum: ['Batch', 'Study Group', 'Department', 'Program'] })
  category: string;

  @Prop({ type: String, default: '' })
  coverImage: string;

  @Prop({ type: String, default: 'active', enum: ['draft', 'active', 'archived'] })
  status: string;

  @Prop({ type: String, default: 'invite_only', enum: ['open', 'invite_only', 'restricted'] })
  accessMode: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @Prop({ type: String, default: 'admin', enum: ['admin', 'teacher'] })
  ownerType: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Teacher' }], default: [] })
  teachers: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  courseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Community' })
  communityId?: Types.ObjectId;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Number, default: 0 })
  maxMembers: number;

  @Prop({ type: Number, default: 0 })
  memberCount: number;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const LearningSpaceSchema = SchemaFactory.createForClass(LearningSpace);
LearningSpaceSchema.index({ code: 1 }, { unique: true });
LearningSpaceSchema.index({ status: 1, accessMode: 1 });
LearningSpaceSchema.index({ teachers: 1 });
LearningSpaceSchema.index({ communityId: 1 });
LearningSpaceSchema.index({ courseId: 1 });
