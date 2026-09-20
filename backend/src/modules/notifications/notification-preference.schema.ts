import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference & Document;

@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  emailNotifications: boolean;

  @Prop({ type: Boolean, default: true })
  inAppNotifications: boolean;

  @Prop({
    type: Object,
    default: {
      announcements: true,
      spaces: true,
      discussions: true,
      connections: true,
      opportunities: true,
    },
  })
  categories: {
    announcements: boolean;
    spaces: boolean;
    discussions: boolean;
    connections: boolean;
    opportunities: boolean;
  };
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
NotificationPreferenceSchema.index({ userId: 1 }, { unique: true });
