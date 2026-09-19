import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommunityReportDocument = CommunityReport &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  timestamps: true,
  collection: 'network_community_reports',
})
export class CommunityReport {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  reporterId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['discussion', 'reply', 'community'],
    required: true,
    index: true,
  })
  targetType!: 'discussion' | 'reply' | 'community';

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  targetId!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  })
  reason!: string;

  @Prop({
    type: String,
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending',
    index: true,
  })
  status!: 'pending' | 'reviewed' | 'dismissed';
}

export const CommunityReportSchema =
  SchemaFactory.createForClass(CommunityReport);

CommunityReportSchema.index({ reporterId: 1, createdAt: -1 });
CommunityReportSchema.index({ targetType: 1, targetId: 1 });
