import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedMessageDocument = SavedMessage & Document;

@Schema({ timestamps: true, collection: 'saved_messages' })
export class SavedMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message', required: true, index: true })
  messageId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId!: Types.ObjectId;

  @Prop({ type: Date, default: Date.now, index: true })
  savedAt!: Date;
}

export const SavedMessageSchema = SchemaFactory.createForClass(SavedMessage);
SavedMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
SavedMessageSchema.index({ userId: 1, savedAt: -1 });
