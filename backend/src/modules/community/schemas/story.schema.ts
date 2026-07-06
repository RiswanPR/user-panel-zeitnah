import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StoryType } from '../domain/story.model';

export type StoryDocument = Story & Document;

@Schema({ timestamps: true, collection: 'community_stories' })
export class Story {
  @Prop({ type: String, default: () => new Types.ObjectId().toString(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  authorId: string;

  @Prop({ type: String, enum: StoryType, required: true })
  type: StoryType;

  @Prop({ type: String })
  mediaUrl?: string;

  @Prop({ type: String })
  thumbnailUrl?: string;

  @Prop({ type: String })
  backgroundColor?: string;

  @Prop({ type: String })
  text?: string;

  @Prop({ type: String })
  link?: string;

  @Prop({ type: String, index: true })
  courseTag?: string;

  @Prop({
    type: Object,
    default: {
      views: 0,
      reactions: 0,
      replies: 0,
    },
  })
  stats: {
    views: number;
    reactions: number;
    replies: number;
  };

  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  // TTL index - MongoDB will automatically delete documents where expiresAt is in the past
  @Prop({ type: Date, required: true, index: { expires: '0s' } })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const StorySchema = SchemaFactory.createForClass(Story);

// Index for efficiently finding active stories for a user's feed
StorySchema.index({ authorId: 1, expiresAt: 1 });
