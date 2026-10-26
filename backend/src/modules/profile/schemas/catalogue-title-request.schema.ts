import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatalogueTitleRequestDocument = CatalogueTitleRequest & Document;

export type TitleRequestStatus = 'pending' | 'approved' | 'rejected';

@Schema({ timestamps: true, collection: 'catalogue_title_requests' })
export class CatalogueTitleRequest {
  @Prop({ type: String, required: true, unique: true, index: true, trim: true })
  id!: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  userId!: string;

  @Prop({ type: String, trim: true, default: '' })
  userName?: string;

  @Prop({ type: String, trim: true, default: '' })
  userEmail?: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  departmentId!: string;

  @Prop({ type: String, required: true, trim: true })
  departmentName!: string;

  @Prop({ type: String, required: true, trim: true })
  requestedTitle!: string;

  @Prop({ type: String, required: true, index: true, trim: true })
  normalizedTitle!: string;

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  })
  status!: TitleRequestStatus;

  @Prop({ type: Date, default: Date.now })
  submittedAt!: Date;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  @Prop({ type: String, default: null, trim: true })
  reviewerId?: string | null;

  @Prop({ type: String, default: null, trim: true })
  reviewerName?: string | null;

  @Prop({ type: String, default: null, trim: true })
  reviewNote?: string | null;

  @Prop({ type: String, default: null, trim: true })
  createdTitleId?: string | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CatalogueTitleRequestSchema = SchemaFactory.createForClass(
  CatalogueTitleRequest,
);

// Compound indexes for performant querying and duplicate detection
CatalogueTitleRequestSchema.index({
  departmentId: 1,
  normalizedTitle: 1,
  status: 1,
});
CatalogueTitleRequestSchema.index({ status: 1, createdAt: -1 });
CatalogueTitleRequestSchema.index({ userId: 1, status: 1 });
