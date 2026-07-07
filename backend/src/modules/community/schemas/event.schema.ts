import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type CommunityEventDocument = CommunityEvent & Document;
export type EventRsvpDocument = EventRsvp & Document;

@Schema({ timestamps: true, collection: 'community_events' })
export class CommunityEvent {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true, index: true })
  creatorId: string;

  @Prop({ type: String, index: true })
  groupId?: string; // Optional: if event belongs to a private group

  @Prop({ type: String, index: true })
  courseId?: string; // Optional: if event belongs to a specific course

  @Prop({ type: Date, required: true })
  startTime: Date;

  @Prop({ type: Date, required: true })
  endTime: Date;

  @Prop({
    type: String,
    enum: ['webinar', 'meetup', 'ama', 'office_hours'],
    default: 'meetup',
  })
  type: string;

  @Prop({ type: String })
  meetingLink?: string;

  @Prop({ type: String })
  coverImage?: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}
export const CommunityEventSchema =
  SchemaFactory.createForClass(CommunityEvent);

@Schema({ timestamps: true, collection: 'community_event_rsvps' })
export class EventRsvp {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true })
  eventId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({
    type: String,
    enum: ['going', 'maybe', 'not_going'],
    default: 'going',
  })
  status: string;
}
export const EventRsvpSchema = SchemaFactory.createForClass(EventRsvp);
EventRsvpSchema.index({ eventId: 1, userId: 1 }, { unique: true });
