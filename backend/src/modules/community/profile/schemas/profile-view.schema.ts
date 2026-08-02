import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ProfileViewDocument = ProfileView & Document;

@Schema({ timestamps: true, collection: 'community_profile_views' })
export class ProfileView {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  profileId: string; // The user ID of the profile being viewed

  @Prop({ type: String, default: '' })
  viewerId: string; // The user ID of the viewer (if logged in)

  @Prop({ type: String, default: '' })
  viewerIp: string;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;
}

export const ProfileViewSchema = SchemaFactory.createForClass(ProfileView);
ProfileViewSchema.index({ profileId: 1, createdAt: -1 });
