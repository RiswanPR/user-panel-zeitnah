import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ type: MongooseSchema.Types.Mixed, default: () => new Types.ObjectId() })
  _id?: any;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({ type: String, default: 'general' })
  type: string; // 'general' | 'course' | 'learning_space' | 'platform' | 'maintenance' | 'critical'

  @Prop({ type: String, default: 'normal' })
  priority: string; // 'normal' | 'important' | 'critical' | 'high' | 'low'

  @Prop({ type: String, default: 'draft', index: true })
  status: string; // 'draft' | 'scheduled' | 'published' | 'archived'

  @Prop({ type: Boolean, default: false, index: true })
  isCritical: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isPublished: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, ref: 'PlatformAnnouncement', default: null })
  platformAnnouncementId?: any;

  @Prop({ type: Types.ObjectId, default: null })
  communityAnnouncementId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: String, default: 'admin' })
  createdByRole?: string;

  @Prop({ type: String, default: 'Admin' })
  createdByName?: string;

  @Prop({ type: String, default: 'platform', index: true })
  targetType: string; // 'platform' | 'specific_users' | 'course' | 'teacher_students' | 'learning_space' | 'role'

  @Prop({ type: [Object], default: [] })
  targetIds: any[];

  @Prop({ type: Types.ObjectId, ref: 'Course', default: null, index: true })
  courseId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'LearningSpace',
    default: null,
    index: true,
  })
  learningSpaceId?: Types.ObjectId;

  @Prop({ type: Date, default: null })
  scheduledAt?: Date;

  @Prop({ type: Date, default: null })
  publishedAt?: Date;

  @Prop({ type: Date, default: null })
  startsAt?: Date;

  @Prop({ type: Date, default: null })
  expiresAt?: Date;

  @Prop({ type: Boolean, default: true })
  allowDismiss: boolean;

  @Prop({ type: Object, default: null })
  cta?: {
    label?: string;
    url?: string;
  };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dismissedBy: Types.ObjectId[];

  @Prop({ type: String, default: '' })
  eyebrow?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
AnnouncementSchema.index({
  status: 1,
  isPublished: 1,
  scheduledAt: 1,
  expiresAt: 1,
});
AnnouncementSchema.index({ targetType: 1, courseId: 1, learningSpaceId: 1 });
AnnouncementSchema.index({ createdAt: -1 });
