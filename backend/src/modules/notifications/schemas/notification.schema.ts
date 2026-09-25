import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationCategory =
  | 'social'
  | 'learning'
  | 'course'
  | 'achievement'
  | 'leaderboard'
  | 'community'
  | 'organization'
  | 'opportunity'
  | 'identity'
  | 'security'
  | 'system';

export type NotificationPriority =
  'critical' | 'high' | 'important' | 'normal' | 'low';

export type NotificationDocument = Notification &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  timestamps: true,
  collection: 'notifications',
})
export class Notification {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipientId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  actorId?: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  type!: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'social',
      'learning',
      'course',
      'achievement',
      'leaderboard',
      'community',
      'organization',
      'opportunity',
      'identity',
      'security',
      'system',
    ],
    default: 'system',
    index: true,
  })
  category!: NotificationCategory;

  @Prop({
    type: String,
    required: true,
    enum: ['critical', 'high', 'important', 'normal', 'low'],
    default: 'normal',
    index: true,
  })
  priority!: NotificationPriority;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  message!: string;

  @Prop({ type: String, required: false })
  entityType?: string;

  @Prop({ type: String, required: false })
  entityId?: string;

  @Prop({ type: String, required: false })
  actionUrl?: string;

  @Prop({ type: Object, required: false, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Date, required: false, default: null })
  readAt?: Date | null;

  @Prop({
    type: String,
    required: false,
    sparse: true,
    unique: true,
  })
  idempotencyKey?: string;

  @Prop({ type: Date, required: false, default: null })
  deletedAt?: Date | null;

  @Prop({
    type: Object,
    required: false,
    default: { inApp: true, email: false, push: false },
  })
  delivery?: {
    inApp?: boolean;
    email?: boolean;
    push?: boolean;
  };
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// ── Compound Indexes for High-Performance Queries ──
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, deletedAt: 1, createdAt: -1 });
