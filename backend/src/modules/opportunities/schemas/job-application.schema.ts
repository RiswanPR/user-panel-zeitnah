import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobApplicationDocument = JobApplication & Document;

export enum JobApplicationStatus {
  SUBMITTED = 'submitted',
  WITHDRAWN = 'withdrawn',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  OFFERED = 'offered',
}

@Schema({ timestamps: true, collection: 'job_applications' })
export class JobApplication {
  @Prop({
    type: Types.ObjectId,
    ref: 'Opportunity',
    required: true,
    index: true,
  })
  jobId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  candidateUserId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(JobApplicationStatus),
    default: JobApplicationStatus.SUBMITTED,
    index: true,
  })
  status!: JobApplicationStatus;

  @Prop({ default: '', trim: true })
  resumeUrl!: string;

  @Prop({ default: '', trim: true })
  coverNote!: string;

  @Prop({ type: Date, default: Date.now })
  appliedAt!: Date;

  @Prop({ type: Date, default: null })
  withdrawnAt!: Date | null;
}

export const JobApplicationSchema =
  SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.index({ jobId: 1, candidateUserId: 1 }, { unique: true });
JobApplicationSchema.index({ businessId: 1, status: 1 });
JobApplicationSchema.index({ candidateUserId: 1, createdAt: -1 });
