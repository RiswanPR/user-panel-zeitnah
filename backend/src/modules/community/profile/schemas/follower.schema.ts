import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type FollowerDocument = Follower & Document;

@Schema({ timestamps: true, collection: 'community_followers' })
export class Follower {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string; // The user being followed

  @Prop({ type: String, required: true, index: true })
  followerId: string; // The user doing the following

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const FollowerSchema = SchemaFactory.createForClass(Follower);
FollowerSchema.index({ userId: 1, followerId: 1 }, { unique: true });
FollowerSchema.index({ followerId: 1 });
