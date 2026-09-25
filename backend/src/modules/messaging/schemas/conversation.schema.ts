import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  MESSAGE_REQUEST = 'MESSAGE_REQUEST',
}

export enum RequestStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

@Schema({ _id: false })
export class ConversationMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' })
  role!: string;

  @Prop({ type: Date, default: Date.now })
  joinedAt!: Date;

  @Prop({ type: Date, default: Date.now })
  lastReadAt!: Date;

  @Prop({ type: Date, default: null })
  mutedUntil?: Date | null;

  @Prop({ type: Boolean, default: false })
  isArchived!: boolean;

  @Prop({ type: Boolean, default: false })
  isDeletedFor!: boolean;
}

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    default: ConversationType.DIRECT,
    index: true,
  })
  type!: ConversationType;

  @Prop({ default: '', trim: true })
  name!: string;

  @Prop({ default: '' })
  avatar!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], index: true })
  participants!: Types.ObjectId[];

  @Prop({ type: [ConversationMember], default: [] })
  members!: ConversationMember[];

  @Prop({
    type: {
      messageId: { type: Types.ObjectId, ref: 'Message' },
      senderId: { type: Types.ObjectId, ref: 'User' },
      body: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      status: { type: String, default: 'SENT' },
    },
    default: null,
  })
  lastMessage?: {
    messageId?: Types.ObjectId;
    senderId?: Types.ObjectId;
    body: string;
    createdAt: Date;
    status: string;
  } | null;

  @Prop({ type: Date, default: Date.now, index: true })
  lastMessageAt!: Date;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    default: RequestStatus.NONE,
    index: true,
  })
  requestStatus!: RequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  requestRecipientId?: Types.ObjectId | null;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'ARCHIVED'] })
  status!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ 'members.userId': 1, lastMessageAt: -1 });
ConversationSchema.index({ participants: 1, type: 1 });
ConversationSchema.index({ requestRecipientId: 1, requestStatus: 1 });
