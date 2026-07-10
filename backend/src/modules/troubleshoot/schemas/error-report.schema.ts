import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ErrorReportDocument = ErrorReport & Document;

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'open' | 'investigating' | 'resolved';

@Schema({
  timestamps: true,
  collection: 'troubleshoot-reports',
})
export class ErrorReport {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  userId!: Types.ObjectId | null;

  @Prop({ default: '', trim: true })
  userEmail!: string;

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity!: ErrorSeverity;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  description!: string;

  @Prop({ default: '', trim: true })
  pageUrl!: string;

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  consoleErrors!: Array<{
    type: string;
    message: string;
    timestamp: string;
    stack?: string;
  }>;

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  networkErrors!: Array<{
    method: string;
    url: string;
    status: number;
    message: string;
    timestamp: string;
  }>;

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  unhandledErrors!: Array<{
    type: string;
    message: string;
    timestamp: string;
    stack?: string;
    source?: string;
  }>;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  browserInfo!: {
    browser: string;
    os: string;
    screenSize: string;
    userAgent: string;
  };

  @Prop({
    default: 'open',
    enum: ['open', 'investigating', 'resolved'],
  })
  status!: ReportStatus;
}

export const ErrorReportSchema = SchemaFactory.createForClass(ErrorReport);

ErrorReportSchema.index({ userId: 1, createdAt: -1 });
ErrorReportSchema.index({ severity: 1, createdAt: -1 });
ErrorReportSchema.index({ status: 1, createdAt: -1 });
