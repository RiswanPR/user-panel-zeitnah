import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnnouncementType = 'INFO' | 'IMPORTANT' | 'HIGH' | 'CRITICAL';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'IMPORTANT' | 'HIGH' | 'CRITICAL';
export type AnnouncementAudience = 'ALL_USERS' | 'STUDENTS' | 'COURSE_LEARNERS' | 'COMMUNITY_MEMBERS';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type PlatformAnnouncementDocument = PlatformAnnouncement &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  timestamps: true,
  collection: 'platform_announcements',
})
export class PlatformAnnouncement {
  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: true, trim: true })
  message!: string;

  @Prop({
    type: String,
    required: true,
    enum: ['INFO', 'IMPORTANT', 'HIGH', 'CRITICAL'],
    default: 'INFO',
    index: true,
  })
  type!: AnnouncementType;

  @Prop({
    type: String,
    required: true,
    enum: ['LOW', 'NORMAL', 'IMPORTANT', 'HIGH', 'CRITICAL'],
    default: 'NORMAL',
    index: true,
  })
  priority!: AnnouncementPriority;

  @Prop({
    type: String,
    required: true,
    enum: ['ALL_USERS', 'STUDENTS', 'COURSE_LEARNERS', 'COMMUNITY_MEMBERS'],
    default: 'ALL_USERS',
    index: true,
  })
  audience!: AnnouncementAudience;

  @Prop({
    type: Object,
    required: false,
    default: null,
  })
  target?: {
    entityType?: string;
    entityId?: string;
  };

  @Prop({
    type: String,
    required: true,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'PUBLISHED',
    index: true,
  })
  status!: AnnouncementStatus;

  @Prop({ type: String, required: false })
  actionUrl?: string;

  @Prop({ type: String, required: false })
  actionLabel?: string;

  @Prop({ type: Date, required: true, default: Date.now })
  startsAt!: Date;

  @Prop({ type: Date, required: false, default: null })
  expiresAt?: Date | null;

  @Prop({ type: [String], default: [] })
  dismissedBy!: string[];
}

export const PlatformAnnouncementSchema =
  SchemaFactory.createForClass(PlatformAnnouncement);

PlatformAnnouncementSchema.index({ status: 1, startsAt: 1, expiresAt: 1 });
PlatformAnnouncementSchema.index({ audience: 1, status: 1 });
