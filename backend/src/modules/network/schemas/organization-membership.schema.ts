import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationMembershipDocument = OrganizationMembership & Document;

@Schema({ timestamps: true, collection: 'organization_memberships' })
export class OrganizationMembership {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'OWNER',
      'ADMIN',
      'RECRUITER',
      'EDITOR',
      'STAFF',
      'EDUCATOR',
      'MEMBER',
    ],
    default: 'MEMBER',
  })
  role: string;

  @Prop({
    type: String,
    enum: ['ACTIVE', 'INVITED', 'SUSPENDED'],
    default: 'ACTIVE',
  })
  status: string;

  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;
}

export const OrganizationMembershipSchema = SchemaFactory.createForClass(OrganizationMembership);
OrganizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrganizationMembershipSchema.index({ userId: 1, status: 1 });
