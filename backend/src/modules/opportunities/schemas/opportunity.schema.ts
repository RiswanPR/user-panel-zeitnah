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
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OpportunityType),
    default: OpportunityType.JOB,
    index: true,
  })
  type!: OpportunityType;

  @Prop({ default: 'Full-time', trim: true, index: true })
  jobType!: string;

  @Prop({ default: 'Full-time', trim: true })
  employmentType!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ default: '', trim: true, index: true })
  discipline!: string;

  @Prop({ default: '', trim: true })
  specialization!: string;

  @Prop({ default: '', trim: true, index: true })
  infrastructureSector!: string;

  @Prop({ type: Number, default: 0, index: true })
  minYearsExperience!: number;

  @Prop({ type: Number, default: 0, index: true })
  maxYearsExperience!: number;

  @Prop({ type: [String], default: [], index: true })
  requiredSkills!: string[];

  @Prop({ type: [String], default: [] })
  preferredSkills!: string[];

  @Prop({ type: [String], default: [], index: true })
  requiredSoftware!: string[];

  @Prop({ type: [String], default: [] })
  preferredSoftware!: string[];

  @Prop({ default: '', trim: true })
  requiredEducation!: string;

  @Prop({ default: '', trim: true })
  preferredEducation!: string;

  @Prop({ type: [String], default: [] })
  requiredCertifications!: string[];

  @Prop({ type: [String], default: [] })
  preferredCertifications!: string[];

  @Prop({ type: [String], default: [], index: true })
  skills!: string[];

  @Prop({ default: '', trim: true, index: true })
  location!: string;

  @Prop({
    type: String,
    default: 'On-site',
    index: true,
  })
  workMode!: string;

  @Prop({
    type: String,
    enum: Object.values(ExperienceLevel),
    default: ExperienceLevel.ENTRY,
    index: true,
  })
  experienceLevel!: ExperienceLevel;

  @Prop({ type: Number, default: null })
  salaryMin!: number | null;

  @Prop({ type: Number, default: null })
  salaryMax!: number | null;

  @Prop({ default: 'INR', trim: true })
  currency!: string;

  @Prop({ default: '', trim: true })
  responsibilities!: string;

  @Prop({ default: '', trim: true })
  requirements!: string;

  @Prop({ default: '', trim: true })
  benefits!: string;

  @Prop({ type: Date, default: null })
  applicationDeadline!: Date | null;

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
OpportunitySchema.index({
  status: 1,
  type: 1,
  discipline: 1,
  infrastructureSector: 1,
  createdAt: -1,
});
OpportunitySchema.index({
  title: 'text',
  description: 'text',
  requiredSkills: 'text',
  requiredSoftware: 'text',
  discipline: 'text',
  infrastructureSector: 'text',
});

