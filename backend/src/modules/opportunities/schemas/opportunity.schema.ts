import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OpportunityDocument = Opportunity & Document;

export enum OpportunityType {
  JOB = 'JOB',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
  PROJECT = 'PROJECT',
  APPRENTICESHIP = 'APPRENTICESHIP',
  MENTORSHIP = 'MENTORSHIP',
  COLLABORATION = 'COLLABORATION',
}

export enum WorkMode {
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  ONSITE = 'ONSITE',
}

export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
}

export enum OpportunityStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum OpportunityVisibility {
  PUBLIC = 'PUBLIC',
  NETWORK = 'NETWORK',
  PRIVATE = 'PRIVATE',
}

@Schema({ timestamps: true, collection: 'opportunities' })
export class Opportunity {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OpportunityType),
    required: true,
    index: true,
  })
  type!: OpportunityType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ type: [String], default: [], index: true })
  skills!: string[];

  @Prop({ default: '', trim: true, index: true })
  location!: string;

  @Prop({
    type: String,
    enum: Object.values(WorkMode),
    default: WorkMode.REMOTE,
    index: true,
  })
  workMode!: WorkMode;

  @Prop({
    type: String,
    enum: Object.values(ExperienceLevel),
    default: ExperienceLevel.ENTRY,
    index: true,
  })
  experienceLevel!: ExperienceLevel;

  @Prop({
    type: String,
    enum: Object.values(OpportunityVisibility),
    default: OpportunityVisibility.PUBLIC,
  })
  visibility!: OpportunityVisibility;

  @Prop({
    type: String,
    enum: Object.values(OpportunityStatus),
    default: OpportunityStatus.PUBLISHED,
    index: true,
  })
  status!: OpportunityStatus;

  @Prop({ type: Date, default: Date.now })
  publishedAt!: Date;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;
}

export const OpportunitySchema = SchemaFactory.createForClass(Opportunity);
OpportunitySchema.index({ status: 1, type: 1, workMode: 1, createdAt: -1 });
OpportunitySchema.index({ title: 'text', description: 'text', skills: 'text' });
