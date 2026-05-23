import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export type AuditLogSeverity = 'info' | 'warning' | 'critical';

@Schema({
  timestamps: true,
})
export class AuditLog {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  actor!: Types.ObjectId | null;

  @Prop({
    required: true,
    trim: true,
  })
  action!: string;

  @Prop({
    required: true,
    trim: true,
  })
  entityType!: string;

  @Prop({
    default: '',
    trim: true,
  })
  entityId!: string;

  @Prop({
    default: 'info',
    enum: ['info', 'warning', 'critical'],
  })
  severity!: AuditLogSeverity;

  @Prop({
    default: '',
    trim: true,
  })
  ipAddress!: string;

  @Prop({
    default: '',
    trim: true,
  })
  deviceId!: string;

  @Prop({
    default: '',
    trim: true,
  })
  message!: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata!: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
