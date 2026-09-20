import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlockDocument = Block & Document;

@Schema({ timestamps: true, collection: 'moderation_blocks' })
export class Block {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  blockerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  blockedUserId!: Types.ObjectId;

  @Prop({ default: 'ACTIVE' })
  status!: string;
}

export const BlockSchema = SchemaFactory.createForClass(Block);
BlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });
