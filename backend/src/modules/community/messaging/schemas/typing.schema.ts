import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type TypingDocument = Typing & Document;

@Schema({ timestamps: true, collection: 'community_typings' })
export class Typing {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  conversationId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: Date, default: Date.now, expires: 5 })
  startedAt: Date;
}

export const TypingSchema = SchemaFactory.createForClass(Typing);
TypingSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
