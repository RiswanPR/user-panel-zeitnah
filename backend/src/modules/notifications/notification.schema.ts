import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, default: 'general' })
  category: string;

  @Prop({
    type: String,
    enum: ['LOW', 'NORMAL', 'MEDIUM', 'IMPORTANT', 'HIGH', 'CRITICAL'],
    default: 'NORMAL',
  })
  priority: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date;

  @Prop({ type: String, default: 'general', index: true })
  entityType?: string; // e.g. 'announcement', 'space', 'course'

  @Prop({ type: Types.ObjectId, default: null, index: true })
  entityId?: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  allowDismiss?: boolean;

  @Prop({ type: String })
  idempotencyKey?: string;

  @Prop({ type: String, default: '' })
  targetUrl: string;

  @Prop({ type: String, default: '' })
  actionUrl?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, entityType: 1, entityId: 1 });
NotificationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
