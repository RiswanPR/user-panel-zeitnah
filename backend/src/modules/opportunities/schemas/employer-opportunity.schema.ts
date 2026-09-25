import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployerOpportunityDocument = EmployerOpportunity & Document;

export enum OpportunityInboxStatus {
  SENT = 'sent',
  VIEWED = 'viewed',
  INTERESTED = 'interested',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn',
  ARCHIVED = 'archived',
}

export enum OpportunityDeclineReason {
  NOT_INTERESTED = 'not_interested',
  LOCATION = 'location',
  ROLE_MISMATCH = 'role_mismatch',
  TIMING = 'timing',
  SALARY_MISMATCH = 'salary_mismatch',
  OTHER = 'other',
}

@Schema({ timestamps: true, collection: 'employer_opportunities' })
export class EmployerOpportunity {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Opportunity',
    required: true,
    index: true,
  })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recruiterUserId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  roleTitle!: string;

  @Prop({ default: '', trim: true })
  message!: string;

  @Prop({
    type: String,
    enum: Object.values(OpportunityInboxStatus),
    default: OpportunityInboxStatus.SENT,
    index: true,
  })
  status!: OpportunityInboxStatus;

  @Prop({
    type: String,
    enum: [...Object.values(OpportunityDeclineReason), ''],
    default: '',
  })
  declineReason!: string;

  @Prop({ default: '', trim: true })
  declineNote!: string;

  @Prop({ type: Date, default: null })
  viewedAt!: Date | null;

  @Prop({ type: Date, default: null })
  respondedAt!: Date | null;

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

export const EmployerOpportunitySchema =
  SchemaFactory.createForClass(EmployerOpportunity);
EmployerOpportunitySchema.index(
  { businessId: 1, jobId: 1, candidateUserId: 1 },
  { unique: false },
);
EmployerOpportunitySchema.index({ candidateUserId: 1, status: 1, createdAt: -1 });
EmployerOpportunitySchema.index({ businessId: 1, status: 1 });
EmployerOpportunitySchema.index({ jobId: 1, status: 1 });
