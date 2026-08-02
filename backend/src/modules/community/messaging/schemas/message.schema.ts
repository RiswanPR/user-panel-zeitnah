import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  CODE = 'CODE',
  SYSTEM = 'SYSTEM',
  LINK = 'LINK',
  COURSE = 'COURSE',
  PROJECT = 'PROJECT',
  PLACEMENT = 'PLACEMENT',
}

@Schema({ timestamps: true, collection: 'community_messages' })
export class Message {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  conversationId: string;

  @Prop({ type: String, required: true, index: true })
  senderId: string;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Prop({ type: String, required: true, maxlength: 5000 })
  content: string;

  @Prop({ type: String, default: null })
  replyTo?: string;

  @Prop({ type: String, default: '' })
  mediaUrl?: string;

  @Prop({ type: String, default: '' })
  fileName?: string;

  @Prop({ type: Number, default: 0 })
  fileSize?: number;

  @Prop({ type: String, default: '' })
  codeLanguage?: string;

  @Prop({
    type: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
      },
    ],
    default: [],
  })
  reactions: { userId: string; emoji: string }[];

  @Prop({ type: Boolean, default: false, index: true })
  isPinned: boolean;

  @Prop({ type: String, default: null })
  pinnedBy?: string;

  @Prop({ type: Date, default: null })
  pinnedAt?: Date;

  @Prop({ type: Object, default: {} })
  sharedMetadata?: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  edited: boolean;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, isPinned: -1 });
MessageSchema.index({ senderId: 1 });
