import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommunityMusicDocument = CommunityMusic & Document;

export type MusicLicenseType = 'ROYALTY_FREE' | 'LICENSED' | 'ORIGINAL';

@Schema({ timestamps: true, collection: 'community_music' })
export class CommunityMusic {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  artist: string;

  @Prop({ type: String, trim: true })
  album?: string;

  @Prop({ type: Number, required: true, min: 0 })
  duration: number; // Duration in seconds

  @Prop({ type: String, required: true })
  audioKey: string; // Internal S3 object key or relative asset path

  @Prop({ type: String, required: true })
  audioUrl: string;

  @Prop({ type: String })
  coverKey?: string;

  @Prop({ type: String })
  coverUrl?: string;

  @Prop({ type: String, index: true, default: 'GENERAL' })
  category: string; // e.g. UPBEAT, CHILL, AMBIENT, INSPIRING, FOCUS

  @Prop({ type: String, index: true })
  mood?: string; // e.g. Energetic, Relaxed, Cinematic

  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({
    type: String,
    enum: ['ROYALTY_FREE', 'LICENSED', 'ORIGINAL'],
    default: 'ROYALTY_FREE',
  })
  licenseType: MusicLicenseType;

  @Prop({ type: Boolean, default: false })
  attributionRequired: boolean;

  @Prop({ type: String })
  attributionText?: string;

  @Prop({ type: String })
  licenseReference?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const CommunityMusicSchema =
  SchemaFactory.createForClass(CommunityMusic);

// Performant compound index for listing active tracks by category / recency
CommunityMusicSchema.index({ isActive: 1, category: 1, createdAt: -1 });
CommunityMusicSchema.index({ isActive: 1, createdAt: -1 });
CommunityMusicSchema.index({ title: 'text', artist: 'text', tags: 'text' });
