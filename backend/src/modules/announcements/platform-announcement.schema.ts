import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlatformAnnouncementDocument = PlatformAnnouncement & Document;

@Schema({ timestamps: true, collection: 'platform_announcements' })
export class PlatformAnnouncement {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    enum: ['INFO', 'IMPORTANT', 'HIGH', 'CRITICAL'],
    default: 'INFO',
  })
  type: string;

  @Prop({
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
  })
  priority: string;

  @Prop({
    type: String,
    enum: ['ALL_USERS', 'STUDENTS', 'TEACHERS', 'COURSE_STUDENTS'],
    default: 'ALL_USERS',
  })
  audience: string;

  @Prop({ type: Object, default: {} })
  target: {
    courseId?: string;
    spaceId?: string;
    role?: string;
  };

  @Prop({
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
  })
  status: string;

  @Prop({ type: Date, default: Date.now })
  startsAt: Date;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dismissedBy: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlatformAnnouncementSchema = SchemaFactory.createForClass(PlatformAnnouncement);
PlatformAnnouncementSchema.index({ status: 1, audience: 1, startsAt: 1, expiresAt: 1 });
