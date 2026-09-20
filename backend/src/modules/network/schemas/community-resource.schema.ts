import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityResourceDocument = CommunityResource &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type ResourceType = 'course' | 'document' | 'link';

@Schema({
  timestamps: true,
  collection: 'network_community_resources',
})
export class CommunityResource {
  @Prop({
    type: Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true,
  })
  communityId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  })
  title: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
    maxlength: 1000,
  })
  description: string;

  @Prop({
    type: String,
    enum: ['course', 'document', 'link'],
    default: 'link',
    index: true,
  })
  type: ResourceType;

  @Prop({
    type: String,
    default: '',
  })
  targetId?: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  url?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;
}

export const CommunityResourceSchema =
  SchemaFactory.createForClass(CommunityResource);

CommunityResourceSchema.index({ communityId: 1, createdAt: -1 });
