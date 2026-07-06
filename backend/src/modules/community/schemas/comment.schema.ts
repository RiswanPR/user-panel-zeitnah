import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommentDocument = Comment & Document;
export type CommentReactionDocument = CommentReaction & Document;

@Schema({ timestamps: true, collection: 'community_comments' })
export class Comment {
  @Prop({ type: String, default: () => uuidv4(), index: true })
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
  isAcceptedAnswer: boolean;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });

@Schema({ timestamps: true, collection: 'community_comment_reactions' })
export class CommentReaction {
  @Prop({ type: String, default: () => uuidv4(), index: true })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  commentId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  type: string; // like

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const CommentReactionSchema =
  SchemaFactory.createForClass(CommentReaction);
CommentReactionSchema.index({ commentId: 1, userId: 1 }, { unique: true });
