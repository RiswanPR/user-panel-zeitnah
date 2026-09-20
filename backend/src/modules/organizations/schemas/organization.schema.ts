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
  OTHER = 'OTHER',
}

export enum OrganizationVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REVOKED = 'REVOKED',
}

export enum OrganizationVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
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

  @Prop({ default: '', trim: true, index: true })
  location!: string;

  @Prop({
    type: String,
    enum: Object.values(OrganizationVerificationStatus),
    default: OrganizationVerificationStatus.UNVERIFIED,
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

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy!: Types.ObjectId;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ name: 'text', description: 'text', industry: 'text' });
OrganizationSchema.index({ type: 1, industry: 1, location: 1 });
