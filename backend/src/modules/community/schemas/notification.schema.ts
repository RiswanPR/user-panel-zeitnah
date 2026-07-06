import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'community_notifications' })
export class Notification {
  @Prop({ type: String, default: () => uuidv4(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string; // Recipient of the notification

  @Prop({ type: String, required: true })
  actorId: string; // Who triggered it

  @Prop({ type: String, required: true })
  type: string; // like, comment, reply, mention, story_reaction, announcement

  @Prop({ type: String, index: true })
  entityId?: string; // postId, commentId, storyId, etc.

  @Prop({ type: String })
  entityType?: string; // post, comment, story

  @Prop({ type: String })
  message?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
