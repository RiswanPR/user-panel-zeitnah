import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityReplyDocument = CommunityReply &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type ReplyStatus = 'published' | 'removed';

@Schema({
  timestamps: true,
  collection: 'network_community_replies',
})
export class CommunityReply {
  @Prop({
    type: Types.ObjectId,
    ref: 'CommunityDiscussion',
    required: true,
    index: true,
  })
  discussionId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true,
  })
  communityId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  authorId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  })
  body!: string;

  @Prop({
    type: String,
    enum: ['published', 'removed'],
    default: 'published',
    index: true,
  })
  status!: ReplyStatus;

  @Prop({
    type: Boolean,
    default: false,
  })
  isEdited!: boolean;
}

export const CommunityReplySchema =
  SchemaFactory.createForClass(CommunityReply);

// Query index for flat chronological replies
CommunityReplySchema.index({ discussionId: 1, status: 1, createdAt: 1 });
CommunityReplySchema.index({ authorId: 1, createdAt: -1 });
