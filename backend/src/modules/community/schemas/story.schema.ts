import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { StoryType } from '../domain/story.model';

export type StoryDocument = Story & Document;
export type StoryMediaDocument = StoryMedia & Document;
export type StoryViewDocument = StoryView & Document;
export type StoryReactionDocument = StoryReaction & Document;
export type StoryReplyDocument = StoryReply & Document;
export type StoryMentionDocument = StoryMention & Document;

@Schema({ timestamps: true, collection: 'community_stories' })
export class Story {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  authorId: string;

  @Prop({ type: String, enum: StoryType, required: true })
  type: StoryType;

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

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const StorySchema = SchemaFactory.createForClass(Story);
StorySchema.index({ authorId: 1, expiresAt: 1 });

@Schema({ timestamps: true, collection: 'community_story_media' })
export class StoryMedia {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  storyId: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Number })
  size?: number;

  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;

  @Prop({ type: Number })
  duration?: number;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const StoryMediaSchema = SchemaFactory.createForClass(StoryMedia);

@Schema({ timestamps: true, collection: 'community_story_views' })
export class StoryView {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  storyId: string;

  @Prop({ type: String, required: true })
  userId: string;
}

export const StoryViewSchema = SchemaFactory.createForClass(StoryView);
StoryViewSchema.index({ storyId: 1, userId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_story_reactions' })
export class StoryReaction {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  storyId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  type: string;
}

export const StoryReactionSchema = SchemaFactory.createForClass(StoryReaction);
StoryReactionSchema.index({ storyId: 1, userId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_story_replies' })
export class StoryReply {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  storyId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const StoryReplySchema = SchemaFactory.createForClass(StoryReply);

@Schema({ timestamps: true, collection: 'community_story_mentions' })
export class StoryMention {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  storyId: string;

  @Prop({ type: String, required: true })
  userId: string;
}

export const StoryMentionSchema = SchemaFactory.createForClass(StoryMention);
StoryMentionSchema.index({ storyId: 1, userId: 1 }, { unique: true });
