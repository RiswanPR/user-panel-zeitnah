import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PostType, PostAudience } from '../domain/post.model';

export type PostDocument = Post & Document;
export type PostMediaDocument = PostMedia & Document;
export type PostReactionDocument = PostReaction & Document;
export type SavedPostDocument = SavedPost & Document;
export type PollDocument = Poll & Document;
export type PollOptionDocument = PollOption & Document;
export type PollVoteDocument = PollVote & Document;

export type ReelAudioSourceType = 'ORIGINAL' | 'MUSIC';
export type ReelAudioMode = 'ORIGINAL_ONLY' | 'MUSIC_ONLY' | 'MIXED';

export interface ReelAudioConfig {
  audioMode: ReelAudioMode;
  sourceType?: ReelAudioSourceType;
  musicId?: string;
  musicTitle?: string;
  musicArtist?: string;
  musicCoverUrl?: string;
  sourceStart?: number;
  sourceEnd?: number;
  originalVolume?: number;
  musicVolume?: number;
  originalAudioName?: string;
  attributionText?: string;
}

export type ReelEditorLayerType = 'TEXT' | 'STICKER' | 'CAPTION';

export interface ReelEditorLayer {
  id: string;
  type: ReelEditorLayerType;
  start: number;
  end: number;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  // Text & Caption specific
  content?: string;
  fontFamily?: 'Inter' | 'System Sans' | 'Serif' | 'Mono' | string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '800' | string;
  textAlign?: 'left' | 'center' | 'right' | string;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  shadow?: boolean;
  // Sticker specific
  stickerId?: string;
  // Caption style preset
  style?: 'CLASSIC' | 'BOLD' | 'MINIMAL' | 'HIGHLIGHT' | string;
}

export interface ReelEditorConfig {
  version: number;
  layers: ReelEditorLayer[];
}

@Schema({ timestamps: true, collection: 'community_posts' })
export class Post {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  authorId: string;

  @Prop({ type: String, index: true })
  organizationId?: string;

  @Prop({ type: String, default: '' })
  content: string;

  @Prop({ type: String, default: 'original', index: true })
  postType: 'original' | 'repost' | 'quote';

  @Prop({ type: String, index: true })
  originalPostId?: string;

  @Prop({ type: String })
  quoteText?: string;

  @Prop({
    type: String,
    enum: Object.values(PostType),
    required: true,
    set: (v: string) =>
      typeof v === 'string' ? (v.toUpperCase() as PostType) : v,
  })
  type: PostType;

  @Prop({
    type: String,
    enum: Object.values(PostAudience),
    required: true,
    set: (v: string) =>
      typeof v === 'string' ? (v.toUpperCase() as PostAudience) : v,
  })
  audience: PostAudience;

  @Prop({ type: String, index: true })
  courseId?: string;

  @Prop({ type: String, index: true })
  batchId?: string;

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        type: { type: String, default: 'image' },
        size: { type: Number },
        mimeType: { type: String },
        duration: { type: Number },
        posterUrl: { type: String },
        thumbnailUrl: { type: String },
        processedUrl: { type: String },
        mediaId: { type: String },
        audioConfig: { type: Object },
        editorConfig: { type: Object },
      },
    ],
    default: [],
  })
  media: Array<{
    url: string;
    type: string;
    size?: number;
    mimeType?: string;
    duration?: number;
    posterUrl?: string;
    thumbnailUrl?: string;
    processedUrl?: string;
    mediaId?: string;
    audioConfig?: ReelAudioConfig;
    editorConfig?: ReelEditorConfig;
  }>;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  hashtags: string[];

  @Prop({ type: [String], default: [] })
  mentions: string[];

  @Prop({
    type: Object,
    default: {
      likes: 0,
      loves: 0,
      celebrates: 0,
      insightfuls: 0,
      comments: 0,
      shares: 0,
      views: 0,
      reposts: 0,
    },
  })
  stats: {
    likes: number;
    loves: number;
    celebrates: number;
    insightfuls: number;
    comments: number;
    shares: number;
    views: number;
    reposts: number;
  };

  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: String })
  acceptedAnswerId?: string;

  @Prop({ type: String })
  aiSummary?: string;

  @Prop({ type: Boolean, default: false })
  isLocked: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Defensive canonicalization hooks: guarantee type and audience are canonical uppercase
// before Mongoose schema validation runs, preventing "type: text is not a valid enum value"
PostSchema.pre('validate', function () {
  if (this.type && typeof this.type === 'string') {
    (this as any).type = (this.type as string).toUpperCase() as PostType;
  }
  if (this.audience && typeof this.audience === 'string') {
    (this as any).audience = (
      this.audience as string
    ).toUpperCase() as PostAudience;
  }
});

PostSchema.pre('save', function () {
  if (this.type && typeof this.type === 'string') {
    (this as any).type = (this.type as string).toUpperCase() as PostType;
  }
  if (this.audience && typeof this.audience === 'string') {
    (this as any).audience = (
      this.audience as string
    ).toUpperCase() as PostAudience;
  }
});

PostSchema.index({ createdAt: -1 });
PostSchema.index({ audience: 1, courseId: 1, createdAt: -1 });
// Highly optimized index for the main feed query
PostSchema.index({ isDeleted: 1, createdAt: -1, audience: 1 });
// Highly optimized index for company feed query (Phase 3)
PostSchema.index({ organizationId: 1, isDeleted: 1, createdAt: -1 });
// Reposts & Quote posts queries and idempotency lookup
PostSchema.index({ originalPostId: 1, authorId: 1, postType: 1, isDeleted: 1 });
PostSchema.index(
  { originalPostId: 1, authorId: 1 },
  {
    unique: true,
    partialFilterExpression: { postType: 'repost', isDeleted: false },
  },
);
PostSchema.index({ postType: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ hashtags: 1 });

@Schema({ timestamps: true, collection: 'community_post_media' })
export class PostMedia {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  postId: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  type: string; // image, video, document

  @Prop({ type: Number })
  size?: number;

  @Prop({ type: String })
  mimeType?: string;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;

  @Prop({ type: Number })
  duration?: number; // for videos

  @Prop({ type: String })
  posterUrl?: string;

  @Prop({ type: String })
  thumbnailUrl?: string;

  @Prop({ type: String })
  processedUrl?: string;

  @Prop({ type: String })
  mediaId?: string;

  @Prop({ type: Object })
  audioConfig?: ReelAudioConfig;

  @Prop({ type: Object })
  editorConfig?: ReelEditorConfig;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PostMediaSchema = SchemaFactory.createForClass(PostMedia);

@Schema({ timestamps: true, collection: 'community_post_reactions' })
export class PostReaction {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  type: string; // like, love, celebrate, insightful

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PostReactionSchema = SchemaFactory.createForClass(PostReaction);
PostReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_saved_posts' })
export class SavedPost {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const SavedPostSchema = SchemaFactory.createForClass(SavedPost);
SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'community_polls' })
export class Poll {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  postId: string;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

@Schema({ timestamps: true, collection: 'community_poll_options' })
export class PollOption {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  pollId: string;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: Number, default: 0 })
  voteCount: number;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PollOptionSchema = SchemaFactory.createForClass(PollOption);

@Schema({ timestamps: true, collection: 'community_poll_votes' })
export class PollVote {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  pollId: string;

  @Prop({ type: String, required: true, index: true })
  optionId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const PollVoteSchema = SchemaFactory.createForClass(PollVote);
PollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
