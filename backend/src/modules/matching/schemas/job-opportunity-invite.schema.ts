import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobOpportunityInviteDocument = JobOpportunityInvite & Document;

export enum InviteStatus {
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  INTERESTED = 'INTERESTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true, collection: 'job_opportunity_invites' })
export class JobOpportunityInvite {
  @Prop({ type: Types.ObjectId, ref: 'Opportunity', required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderUserId!: Types.ObjectId;

  @Prop({ type: String, default: '', trim: true })
  message!: string;

  @Prop({
    type: String,
    enum: Object.values(InviteStatus),
    default: InviteStatus.SENT,
    index: true,
  })
  status!: InviteStatus;

  @Prop({ type: Date, default: null })
  viewedAt!: Date | null;

  @Prop({ type: Date, default: null })
  respondedAt!: Date | null;
}

export const JobOpportunityInviteSchema =
  SchemaFactory.createForClass(JobOpportunityInvite);

// Prevent duplicate invites for the same job + candidate
JobOpportunityInviteSchema.index(
  { jobId: 1, candidateUserId: 1 },
  { unique: true },
);

// Efficient lookup for candidate's received invites
JobOpportunityInviteSchema.index({ candidateUserId: 1, status: 1, createdAt: -1 });

// Recruiter's sent invites for a job
JobOpportunityInviteSchema.index({ jobId: 1, senderUserId: 1 });
