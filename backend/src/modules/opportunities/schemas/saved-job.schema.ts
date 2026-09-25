import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedJobDocument = SavedJob & Document;

@Schema({ timestamps: true, collection: 'saved_jobs' })
export class SavedJob {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Opportunity',
    required: true,
    index: true,
  })
  opportunityId!: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);
SavedJobSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
