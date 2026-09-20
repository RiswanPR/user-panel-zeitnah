import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({
    type: String,
    enum: [
      'COMPANY',
      'STARTUP',
      'SCHOOL',
      'COLLEGE',
      'UNIVERSITY',
      'TRAINING_INSTITUTE',
      'NONPROFIT',
      'OTHER',
    ],
    default: 'COMPANY',
  })
  type: string;

  @Prop({ type: String, default: '', trim: true })
  description: string;

  @Prop({ type: String, default: '' })
  logo: string;

  @Prop({ type: String, default: '' })
  website: string;

  @Prop({ type: String, default: '', index: true })
  industry: string;

  @Prop({ type: String, default: '', index: true })
  location: string;

  @Prop({
    type: String,
    enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REVOKED'],
    default: 'UNVERIFIED',
    index: true,
  })
  verificationStatus: string;

  @Prop({
    type: String,
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PUBLIC',
  })
  visibility: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ verificationStatus: 1, visibility: 1 });
OrganizationSchema.index({ name: 'text', industry: 'text', location: 'text' });
