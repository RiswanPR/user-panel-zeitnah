import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ModerationLogDocument = ModerationLog & Document;

@Schema({ timestamps: true, collection: 'community_moderation_logs' })
export class ModerationLog {
  @Prop({ type: String, default: () => uuidv4(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  moderatorId: string; // The admin/moderator who performed the action

  @Prop({ type: String, required: true })
  action: string; // e.g., 'hide_post', 'delete_comment', 'ban_user', 'warn_user'

  @Prop({ type: String, required: true, index: true })
  entityId: string; // The ID of the post, comment, or user affected

  @Prop({ type: String, required: true })
  entityType: string; // 'post', 'comment', 'user', 'story'

  @Prop({ type: String })
  reason?: string; // e.g., 'Violation of community guidelines'

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Store previous state or extra info
}

export const ModerationLogSchema = SchemaFactory.createForClass(ModerationLog);
ModerationLogSchema.index({ createdAt: -1 });
