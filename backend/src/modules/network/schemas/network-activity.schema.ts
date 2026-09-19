import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NetworkActivityDocument = NetworkActivity &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export type NetworkActivityType =
  | 'COURSE_COMPLETED'
  | 'LESSON_COMPLETED'
  | 'ACHIEVEMENT_EARNED'
  | 'STREAK_MILESTONE'
  | 'COURSE_JOINED';

export type NetworkActivityVisibility = 'public' | 'connections' | 'private';

@Schema({
  timestamps: true,
  collection: 'network_activities',
})
export class NetworkActivity {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  actorId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: [
      'COURSE_COMPLETED',
      'LESSON_COMPLETED',
      'ACHIEVEMENT_EARNED',
      'STREAK_MILESTONE',
      'COURSE_JOINED',
    ],
    index: true,
  })
  type!: NetworkActivityType;

  // Idempotency key: e.g. `${actorId}_${type}_${sourceEntityId}` (or `${actorId}_STREAK_${days}`)
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  idempotencyKey!: string;

  // Safe Context fields
  @Prop({ type: String })
  courseId?: string;

  @Prop({ type: String })
  courseName?: string;

  @Prop({ type: String })
  lessonId?: string;

  @Prop({ type: String })
  lessonName?: string;

  @Prop({ type: String })
  achievementId?: string;

  @Prop({ type: String })
  achievementName?: string;

  @Prop({ type: Number })
  streakDays?: number;

  @Prop({
    type: String,
    enum: ['public', 'connections', 'private'],
    default: 'public',
    index: true,
  })
  visibility!: NetworkActivityVisibility;

  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  createdAt!: Date;
}

export const NetworkActivitySchema =
  SchemaFactory.createForClass(NetworkActivity);

// Performance indexes for feed querying, filtering, and single-user timeline
NetworkActivitySchema.index({ visibility: 1, createdAt: -1 });
NetworkActivitySchema.index({ actorId: 1, createdAt: -1 });
NetworkActivitySchema.index({ type: 1, createdAt: -1 });
NetworkActivitySchema.index({ visibility: 1, type: 1, createdAt: -1 });
