import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationMembershipDocument = OrganizationMembership & Document;

export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  EDITOR = 'EDITOR',
  STAFF = 'STAFF',
  EDUCATOR = 'EDUCATOR',
  MEMBER = 'MEMBER',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
}

@Schema({ timestamps: true, collection: 'organization_memberships' })
export class OrganizationMembership {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OrganizationRole),
    default: OrganizationRole.MEMBER,
    index: true,
  })
  role!: OrganizationRole;

  @Prop({
    type: String,
    enum: Object.values(MembershipStatus),
    default: MembershipStatus.ACTIVE,
    index: true,
  })
  status!: MembershipStatus;

  @Prop({ type: Date, default: Date.now })
  joinedAt!: Date;
}

export const OrganizationMembershipSchema = SchemaFactory.createForClass(OrganizationMembership);
OrganizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrganizationMembershipSchema.index({ userId: 1, role: 1 });
