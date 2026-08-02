import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type MessageReadDocument = MessageRead & Document;

@Schema({ timestamps: true, collection: 'community_message_reads' })
export class MessageRead {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  messageId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: Date, default: Date.now })
  seenAt: Date;
}

export const MessageReadSchema = SchemaFactory.createForClass(MessageRead);
MessageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });
