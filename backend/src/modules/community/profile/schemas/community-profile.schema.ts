import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommunityProfileDocument = CommunityProfile & Document;

@Schema({ timestamps: true, collection: 'community_profiles' })
export class CommunityProfile {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  username: string;

  @Prop({ type: String, default: '' })
  headline: string;

  @Prop({ type: String, default: '' })
  bio: string;

  @Prop({ type: String, default: '', index: true })
  college: string;

  @Prop({ type: String, default: '', index: true })
  branch: string;

  @Prop({ type: String, default: '' })
  batchYear: string;

  @Prop({ type: Number, default: 0, index: true })
  reputationXP: number;

  @Prop({ type: String, default: '' })
  profilePicture: string;

  @Prop({ type: String, default: '' })
  coverBanner: string;

  @Prop({ type: String, default: '' })
  resumeUrl: string;

  @Prop({
    type: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    default: {},
  })
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };

  @Prop({ type: [String], default: [], index: true })
  skills: string[];

  @Prop({ type: Number, default: 0 })
  completionPercentage: number;

  @Prop({ type: Number, default: 0 })
  viewsCount: number;

  @Prop({ type: Number, default: 0 })
  followersCount: number;

  @Prop({ type: Number, default: 0 })
  followingCount: number;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;
}

export const CommunityProfileSchema =
  SchemaFactory.createForClass(CommunityProfile);

CommunityProfileSchema.index({ college: 1, branch: 1 });
CommunityProfileSchema.index({ reputationXP: -1 });
