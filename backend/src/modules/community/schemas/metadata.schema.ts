import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type TagDocument = Tag & Document;
export type PostTagDocument = PostTag & Document;
export type MentionDocument = Mention & Document;
export type HashtagDocument = Hashtag & Document;
export type ViewDocument = View & Document;
export type ReportDocument = Report & Document;

@Schema({ timestamps: true, collection: 'community_tags' })
export class Tag {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, unique: true })
  name: string;
}
export const TagSchema = SchemaFactory.createForClass(Tag);

@Schema({ timestamps: true, collection: 'community_post_tags' })
export class PostTag {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: String, required: true })
  tagId: string;
}
export const PostTagSchema = SchemaFactory.createForClass(PostTag);
PostTagSchema.index({ postId: 1, tagId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_mentions' })
export class Mention {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string; // The user who was mentioned

  @Prop({ type: String, required: true, index: true })
  entityId: string; // postId, commentId, etc.

  @Prop({ type: String, required: true })
  entityType: string;
}
export const MentionSchema = SchemaFactory.createForClass(Mention);

@Schema({ timestamps: true, collection: 'community_hashtags' })
export class Hashtag {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  useCount: number;
}
export const HashtagSchema = SchemaFactory.createForClass(Hashtag);

@Schema({ timestamps: true, collection: 'community_views' })
export class View {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  entityId: string; // postId or storyId

  @Prop({ type: String, required: true })
  entityType: string;
}
export const ViewSchema = SchemaFactory.createForClass(View);
ViewSchema.index({ userId: 1, entityId: 1, entityType: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_reports' })
export class Report {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  reporterId: string;

  @Prop({ type: String, required: true, index: true })
  entityId: string;

  @Prop({ type: String, required: true })
  entityType: string; // post, comment, story, user

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
  })
  status: string;
}
export const ReportSchema = SchemaFactory.createForClass(Report);
