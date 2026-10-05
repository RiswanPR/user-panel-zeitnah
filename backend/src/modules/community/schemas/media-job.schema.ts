import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommunityMediaJobDocument = CommunityMediaJob & Document;

export type MediaProcessingStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'NOT_REQUIRED';

@Schema({ timestamps: true, collection: 'community_media_jobs' })
export class CommunityMediaJob {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  mediaId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, index: true })
  postId?: string;

  @Prop({ type: String, required: true })
  sourceKey: string;

  @Prop({ type: String, required: true })
  sourceUrl: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, default: 0 })
  trimStart: number;

  @Prop({ type: Number })
  trimEnd?: number;

  @Prop({
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'READY', 'FAILED', 'NOT_REQUIRED'],
    default: 'QUEUED',
    index: true,
  })
  status: MediaProcessingStatus;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts: number;

  @Prop({ type: Date })
  lockedAt?: Date;

  @Prop({ type: String })
  lockedBy?: string;

  @Prop({ type: Number })
  sourceDuration?: number;

  @Prop({ type: Number })
  sourceWidth?: number;

  @Prop({ type: Number })
  sourceHeight?: number;

  @Prop({ type: Number })
  sourceSize?: number;

  @Prop({ type: Number })
  outputDuration?: number;

  @Prop({ type: Number })
  outputWidth?: number;

  @Prop({ type: Number })
  outputHeight?: number;

  @Prop({ type: Number })
  outputSize?: number;

  @Prop({ type: String })
  outputKey?: string;

  @Prop({ type: String })
  outputUrl?: string;

  @Prop({ type: String })
  posterKey?: string;

  @Prop({ type: String })
  posterUrl?: string;

  @Prop({ type: String })
  customCoverUrl?: string;

  @Prop({ type: Object })
  audioConfig?: {
    audioMode?: 'ORIGINAL_ONLY' | 'MUSIC_ONLY' | 'MIXED';
    sourceType?: 'ORIGINAL' | 'MUSIC';
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
  };

  @Prop({ type: String })
  errorCode?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: Boolean, default: false })
  isPermanentFailure: boolean;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const CommunityMediaJobSchema =
  SchemaFactory.createForClass(CommunityMediaJob);

// High-performance indexes for worker polling, status check, and user lookup
CommunityMediaJobSchema.index({ status: 1, createdAt: 1 });
CommunityMediaJobSchema.index({ mediaId: 1 }, { unique: true });
CommunityMediaJobSchema.index({ userId: 1, createdAt: -1 });
CommunityMediaJobSchema.index({ lockedAt: 1, status: 1 });
