import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

export enum OrganizationType {
  COMPANY = 'COMPANY',
  STARTUP = 'STARTUP',
  SCHOOL = 'SCHOOL',
  COLLEGE = 'COLLEGE',
  UNIVERSITY = 'UNIVERSITY',
  TRAINING_INSTITUTE = 'TRAINING_INSTITUTE',
  NONPROFIT = 'NONPROFIT',
  CONSULTANCY = 'CONSULTANCY',
  CONTRACTOR = 'CONTRACTOR',
  OTHER = 'OTHER',
}

export enum OrganizationVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REVOKED = 'REVOKED',
}

export enum BusinessStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum OrganizationVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({
    type: String,
    enum: Object.values(OrganizationType),
    default: OrganizationType.COMPANY,
    index: true,
  })
  type!: OrganizationType;

  @Prop({ default: '', trim: true })
  description!: string;

  @Prop({ default: '' })
  logo!: string;

  @Prop({ default: '', trim: true })
  website!: string;

  @Prop({ default: '', trim: true, index: true })
  industry!: string;

  @Prop({ type: [String], default: [], index: true })
  infrastructureSpecializations!: string[];

  @Prop({ default: '', trim: true })
  businessEmail!: string;

  @Prop({ default: '', trim: true })
  businessPhone!: string;

  @Prop({ default: '', trim: true })
  country!: string;

  @Prop({ default: '', trim: true })
  state!: string;

  @Prop({ default: '', trim: true })
  city!: string;

  @Prop({ default: '', trim: true })
  officeLocation!: string;

  @Prop({ default: '', trim: true, index: true })
  location!: string;

  @Prop({ default: '', trim: true })
  companySize!: string;

  @Prop({ type: Number, default: null })
  foundedYear!: number | null;

  @Prop({ default: '', trim: true })
  linkedin!: string;

  @Prop({ type: Object, default: {} })
  socialLinks!: Record<string, string>;

  @Prop({
    type: String,
    enum: Object.values(BusinessStatus),
    default: BusinessStatus.PENDING,
    index: true,
  })
  status!: BusinessStatus;

  @Prop({
    type: String,
    enum: Object.values(OrganizationVerificationStatus),
    default: OrganizationVerificationStatus.PENDING,
    index: true,
  })
  verificationStatus!: OrganizationVerificationStatus;

  @Prop({
    type: String,
    enum: Object.values(OrganizationVisibility),
    default: OrganizationVisibility.PUBLIC,
    index: true,
  })
  visibility!: OrganizationVisibility;

  @Prop({ default: '', trim: true })
  rejectionReason!: string;

  @Prop({ default: '', trim: true })
  suspensionReason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy!: Types.ObjectId;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({
  name: 'text',
  description: 'text',
  industry: 'text',
  infrastructureSpecializations: 'text',
});
OrganizationSchema.index({ status: 1, visibility: 1, createdAt: -1 });
OrganizationSchema.index({ type: 1, industry: 1, location: 1 });
