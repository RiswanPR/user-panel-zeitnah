import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityAnnouncementDocument = CommunityAnnouncement &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  timestamps: true,
  collection: 'network_community_announcements',
})
export class CommunityAnnouncement {
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
    maxlength: 5000,
  })
  content!: string;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  pinned!: boolean;
}

export const CommunityAnnouncementSchema = SchemaFactory.createForClass(
  CommunityAnnouncement,
);

CommunityAnnouncementSchema.index({
  communityId: 1,
  pinned: -1,
  createdAt: -1,
});
