import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true, collection: 'community_comments' })
export class Comment {
  @Prop({ type: String, default: () => new Types.ObjectId().toString(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  postId: string;

  @Prop({ type: String, required: true, index: true })
  authorId: string;

  @Prop({ type: String, index: true })
  parentId?: string; // If this is a nested reply

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  mentions: string[];

  @Prop({
    type: Object,
    default: {
      likes: 0,
      replies: 0,
    },
  })
  stats: {
    likes: number;
    replies: number;
  };

  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @Prop({ type: Boolean, default: false })
  isInstructorHighlight: boolean;

  @Prop({ type: Boolean, default: false })
  isMentorHighlight: boolean;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Index for fetching top-level comments of a post efficiently
CommentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });
