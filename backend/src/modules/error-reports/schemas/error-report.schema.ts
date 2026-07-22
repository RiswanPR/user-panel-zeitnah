import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ErrorReportDocument = ErrorReport & Document;

@Schema({ timestamps: true })
export class ErrorReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  source: string; // 'react_error_boundary', 'window_error', 'api_failure', 'user_feedback_modal'

  @Prop({ required: false })
  correlationId?: string;

  @Prop({ required: false })
  screenshotBase64?: string; // Optional URL or base64

  @Prop({ type: Object })
  browser: Record<string, any>;

  @Prop({ type: Object })
  device: Record<string, any>;

  @Prop({ type: Object })
  network: Record<string, any>;

  @Prop({ type: Object })
  performance: Record<string, any>;

  @Prop({ type: Object })
  application: Record<string, any>;

  @Prop({ type: Object })
  authentication: Record<string, any>; // Scrubbed data

  @Prop({ type: Object, required: false })
  error?: Record<string, any>;

  @Prop({ type: Object, required: false })
  feedback?: Record<string, any>;

  @Prop({ default: 'open' })
  status: string; // 'open', 'in_progress', 'resolved', 'ignored'

  @Prop({ default: 'medium' })
  priority: string; // 'low', 'medium', 'high', 'critical'

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  assignedTo?: Types.ObjectId;
}

export const ErrorReportSchema = SchemaFactory.createForClass(ErrorReport);
