import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationFollowDocument = OrganizationFollow & Document;

@Schema({ timestamps: true, collection: 'organization_follows' })
export class OrganizationFollow {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  notificationsEnabled!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrganizationFollowSchema =
  SchemaFactory.createForClass(OrganizationFollow);

// Compound unique index ensuring only one follow relationship exists between any user and organization
OrganizationFollowSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);

OrganizationFollowSchema.index({ userId: 1, notificationsEnabled: 1 });
