import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  DIRECT = 'DIRECT',
}

@Schema({ timestamps: true, collection: 'community_conversations' })
export class Conversation {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Prop({ type: [String], required: true, index: true })
  participants: string[];

  @Prop({ type: String, default: '' })
  lastMessageId: string;

  @Prop({ type: String, default: '' })
  lastMessagePreview: string;

  @Prop({ type: Date, default: Date.now, index: true })
  lastActivity: Date;

  @Prop({ type: String, required: true })
  createdBy: string;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  @Prop({ type: Boolean, default: false })
  isMuted: boolean;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;
}

export const ConversationSchema =
  SchemaFactory.createForClass(Conversation);
