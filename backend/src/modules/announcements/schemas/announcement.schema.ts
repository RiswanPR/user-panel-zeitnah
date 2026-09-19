import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AnnouncementDocument = Announcement & Document;

export type AnnouncementType =
  | 'maintenance'
  | 'critical'
  | 'important'
  | 'platform'
  | 'course'
  | 'content'
  | 'feature'
  | 'event'
  | 'general';

export type AnnouncementPriority =
  | 'critical'
  | 'maintenance'
  | 'important'
  | 'high'
  | 'normal'
  | 'low';

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'maintenance',
      'critical',
      'important',
      'platform',
      'course',
      'content',
      'feature',
      'event',
      'general',
    ],
    index: true,
  })
  type: AnnouncementType;

  @Prop({
    type: String,
    required: true,
    enum: ['critical', 'maintenance', 'important', 'high', 'normal', 'low'],
    index: true,
  })
  priority: AnnouncementPriority;

  @Prop({ type: String, trim: true })
  eyebrow?: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({
    type: {
      label: { type: String, required: true },
      url: { type: String, required: true },
    },
    default: null,
  })
  cta?: {
    label: string;
    url: string;
  };

  @Prop({ type: Boolean, default: true })
  allowDismiss: boolean;

  @Prop({ type: Date, required: true, default: () => new Date(), index: true })
  startsAt: Date;

  @Prop({ type: Date, default: null, index: true })
  expiresAt?: Date | null;

  @Prop({ type: Boolean, default: true, index: true })
  isPublished: boolean;

  @Prop({ type: [String], default: [], index: true })
  readBy: string[];

  @Prop({ type: [String], default: [], index: true })
  dismissedBy: string[];
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

// Compound indexes for high-speed active announcement querying
AnnouncementSchema.index({
  isPublished: 1,
  startsAt: 1,
  expiresAt: 1,
  priority: 1,
});
