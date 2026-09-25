import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type RecommendationDocument = Recommendation & Document;

@Schema({ timestamps: true, collection: 'recommendations' })
export class Recommendation {
  @Prop({ type: String, default: () => uuidv4() })
  _id!: string;

  @Prop({ type: String, required: true, index: true })
  recipientId!: string;

  @Prop({ type: String, required: true, index: true })
  authorId!: string;

  @Prop({ type: String, required: true, trim: true })
  authorName!: string;

  @Prop({ type: String, required: true, trim: true })
  authorUsername!: string;

  @Prop({ type: String, default: '' })
  authorAvatar!: string;

  @Prop({ type: String, default: '', trim: true })
  authorHeadline!: string;

  @Prop({ type: String, default: 'student', trim: true })
  authorRole!: string;

  @Prop({
    type: String,
    required: true,
    enum: ['Mentor', 'Instructor', 'Peer / Student', 'Collaborator', 'Other'],
    default: 'Peer / Student',
  })
  relationship!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 1000,
  })
  content!: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'hidden'],
    default: 'approved',
    index: true,
  })
  status!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RecommendationSchema =
  SchemaFactory.createForClass(Recommendation);
RecommendationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
RecommendationSchema.index({ authorId: 1, recipientId: 1 });
