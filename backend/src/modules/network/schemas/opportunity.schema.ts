import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OpportunityDocument = Opportunity & Document;

@Schema({ timestamps: true, collection: 'opportunities' })
export class Opportunity {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'JOB',
      'INTERNSHIP',
      'FREELANCE',
      'PROJECT',
      'APPRENTICESHIP',
      'MENTORSHIP',
      'COLLABORATION',
    ],
    default: 'INTERNSHIP',
    index: true,
  })
  type: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, default: '', trim: true })
  description: string;

  @Prop({ type: [String], default: [], index: true })
  skills: string[];

  @Prop({ type: String, default: '', index: true })
  location: string;

  @Prop({
    type: String,
    enum: ['REMOTE', 'HYBRID', 'ONSITE'],
    default: 'REMOTE',
    index: true,
  })
  workMode: string;

  @Prop({
    type: String,
    enum: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'],
    default: 'ENTRY',
    index: true,
  })
  experienceLevel: string;

  @Prop({
    type: String,
    enum: ['PUBLIC', 'NETWORK', 'PRIVATE'],
    default: 'PUBLIC',
  })
  visibility: string;

  @Prop({
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED'],
    default: 'PUBLISHED',
    index: true,
  })
  status: string;

  @Prop({ type: Date, default: Date.now })
  publishedAt: Date;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const OpportunitySchema = SchemaFactory.createForClass(Opportunity);
OpportunitySchema.index({ organizationId: 1, status: 1 });
OpportunitySchema.index({
  type: 1,
  workMode: 1,
  experienceLevel: 1,
  status: 1,
});
OpportunitySchema.index({ title: 'text', description: 'text', skills: 'text' });
