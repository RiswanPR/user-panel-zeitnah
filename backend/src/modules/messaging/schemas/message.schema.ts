import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: 'file' })
  type!: string;

  @Prop({ default: 0 })
  size!: number;
}

@Schema({ _id: false })
export class MessageReaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: ['👍', '❤️', '👏', '🎯'] })
  emoji!: string;

  @Prop({ type: Date, default: Date.now })
  reactedAt!: Date;
}

@Schema({ _id: false })
export class MessageReplyTo {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  messageId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Prop({ required: true })
  senderName!: string;

  @Prop({ default: '' })
  bodySnippet!: string;
}

@Schema({ _id: false })
export class MessageReadReceipt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  readAt!: Date;
}

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId!: Types.ObjectId;

  @Prop({ default: '', trim: true, maxlength: 5000 })
  body!: string;

  @Prop({ type: [MessageAttachment], default: [] })
  attachments!: MessageAttachment[];

  @Prop({ type: MessageReplyTo, default: null })
  replyTo?: MessageReplyTo | null;

  @Prop({ type: [MessageReaction], default: [] })
  reactions!: MessageReaction[];

  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
  })
  status!: MessageStatus;

  @Prop({ type: [MessageReadReceipt], default: [] })
  readBy!: MessageReadReceipt[];

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  deletedFor!: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isEdited!: boolean;

  @Prop({ type: Date, default: null })
  editedAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, senderId: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
