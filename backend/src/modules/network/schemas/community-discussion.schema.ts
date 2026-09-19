import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityDiscussionDocument = CommunityDiscussion &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type DiscussionType =
  'question' | 'discussion' | 'project' | 'resource' | 'study_help';

export type DiscussionStatus = 'published' | 'locked' | 'removed';

@Schema({
  timestamps: true,
  collection: 'network_community_discussions',
})
export class CommunityDiscussion {
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
    maxlength: 200,
  })
  title!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 10000,
  })
  body!: string;

  @Prop({
    type: String,
    enum: ['question', 'discussion', 'project', 'resource', 'study_help'],
    default: 'discussion',
    index: true,
  })
  type!: DiscussionType;

  @Prop({
    type: String,
    enum: ['published', 'locked', 'removed'],
    default: 'published',
    index: true,
  })
  status!: DiscussionStatus;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isPinned!: boolean;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  replyCount!: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  isEdited!: boolean;
}

export const CommunityDiscussionSchema =
  SchemaFactory.createForClass(CommunityDiscussion);

// Query indexes for listing discussions
CommunityDiscussionSchema.index({
  communityId: 1,
  status: 1,
  isPinned: -1,
  createdAt: -1,
});
CommunityDiscussionSchema.index({ authorId: 1, createdAt: -1 });
CommunityDiscussionSchema.index({
  communityId: 1,
  type: 1,
  status: 1,
  createdAt: -1,
});
