import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityMembershipDocument = CommunityMembership &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type CommunityRole = 'member' | 'moderator' | 'owner';
export type MembershipStatus = 'active' | 'pending' | 'removed' | 'banned';

@Schema({
  timestamps: true,
  collection: 'network_community_memberships',
})
export class CommunityMembership {
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
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['member', 'moderator', 'owner'],
    default: 'member',
    index: true,
  })
  role!: CommunityRole;

  @Prop({
    type: String,
    enum: ['active', 'pending', 'removed', 'banned'],
    default: 'active',
    index: true,
  })
  status!: MembershipStatus;

  @Prop({
    type: Date,
    default: Date.now,
  })
  joinedAt!: Date;
}

export const CommunityMembershipSchema =
  SchemaFactory.createForClass(CommunityMembership);

// Compound unique index ensuring a user cannot have duplicate memberships in the same community
CommunityMembershipSchema.index(
  { communityId: 1, userId: 1 },
  { unique: true },
);
CommunityMembershipSchema.index({ userId: 1, status: 1 });
CommunityMembershipSchema.index({ communityId: 1, status: 1, role: 1 });
CommunityMembershipSchema.index({ communityId: 1, createdAt: -1 });
