import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

export enum ReportTargetType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  COMMUNITY = 'COMMUNITY',
  DISCUSSION = 'DISCUSSION',
  OPPORTUNITY = 'OPPORTUNITY',
  PROJECT = 'PROJECT',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Schema({ timestamps: true, collection: 'moderation_reports' })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporterId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ReportTargetType),
    required: true,
    index: true,
  })
  targetType!: ReportTargetType;

  @Prop({ type: String, required: true, index: true })
  targetId!: string;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ default: '', trim: true })
  details!: string;

  @Prop({
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.PENDING,
    index: true,
  })
  status!: ReportStatus;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 });
