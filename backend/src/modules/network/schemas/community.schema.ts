import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityDocument = Community &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type CommunityType =
  | 'COURSE'
  | 'SUBJECT'
  | 'INTEREST'
  | 'PROJECT'
  | 'GOAL'
  | 'GENERAL';

export type CommunityVisibility = 'public' | 'restricted' | 'private';
export type CommunityStatus = 'active' | 'archived';

@Schema({
  timestamps: true,
  collection: 'network_communities',
})
export class Community {
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 120,
  })
  slug: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
    maxlength: 2000,
  })
  description: string;

  @Prop({
    type: String,
    enum: ['COURSE', 'SUBJECT', 'INTEREST', 'PROJECT', 'GOAL', 'GENERAL'],
    default: 'GENERAL',
    index: true,
  })
  type: CommunityType;

  @Prop({
    type: Types.ObjectId,
    ref: 'Course',
    required: false,
    index: true,
  })
  courseId?: Types.ObjectId;

  @Prop({
    type: String,
    default: '',
  })
  avatar: string;

  @Prop({
    type: String,
    default: '',
  })
  coverImage: string;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  memberCount: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  discussionCount: number;

  @Prop({
    type: String,
    enum: ['public', 'restricted', 'private'],
    default: 'public',
    index: true,
  })
  visibility: CommunityVisibility;

  @Prop({
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true,
  })
  status: CommunityStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  creatorId?: Types.ObjectId;

  @Prop({
    type: [String],
    default: [
      'Stay respectful, encouraging, and collaborative.',
      'Keep discussions learning-focused and constructive.',
      'No spam, promotions, or off-topic content.',
      'Respect intellectual property and citation standards.',
    ],
  })
  rules: string[];

  @Prop({
    type: [String],
    default: [],
  })
  topics: string[];
}

export const CommunitySchema = SchemaFactory.createForClass(Community);

// Performance & search indexes
CommunitySchema.index({ visibility: 1, status: 1 });
CommunitySchema.index({ type: 1, status: 1 });
CommunitySchema.index({ createdAt: -1 });
CommunitySchema.index({ memberCount: -1 });
CommunitySchema.index(
  { name: 'text', description: 'text', topics: 'text' },
  { weights: { name: 5, topics: 3, description: 1 } },
);
