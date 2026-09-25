import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VerificationRequestDocument = VerificationRequest & Document;

export enum VerificationCategory {
  IDENTITY = 'IDENTITY',
  PROFESSIONAL = 'PROFESSIONAL',
  EDUCATOR = 'EDUCATOR',
  BUSINESS_AFFILIATION = 'BUSINESS_AFFILIATION',
  CERTIFICATION = 'CERTIFICATION',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true, collection: 'verification_requests' })
export class VerificationRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(VerificationCategory),
    required: true,
    index: true,
  })
  category!: VerificationCategory;

  @Prop({
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.PENDING,
    index: true,
  })
  status!: VerificationStatus;

  @Prop({ default: '', trim: true })
  documentType!: string;

  @Prop({ default: '', trim: true })
  documentNumber!: string;

  @Prop({ default: '', trim: true })
  organizationName!: string;

  @Prop({ default: '', trim: true })
  notes!: string;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        fileKey: { type: String, required: true },
        url: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  evidenceFiles!: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    fileKey: string;
    url: string;
    uploadedAt: Date;
  }>;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ default: '', trim: true })
  rejectionReason!: string;

  @Prop({ default: '', trim: true })
  adminNotes!: string;

  @Prop({ type: Date, default: null })
  validUntil!: Date | null;

  @Prop({
    type: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' },
      },
    ],
    default: [],
  })
  auditLog!: Array<{
    status: string;
    changedAt: Date;
    changedBy?: Types.ObjectId;
    note?: string;
  }>;
}

export const VerificationRequestSchema =
  SchemaFactory.createForClass(VerificationRequest);
VerificationRequestSchema.index({ userId: 1, category: 1, status: 1 });
VerificationRequestSchema.index({ status: 1, createdAt: -1 });
