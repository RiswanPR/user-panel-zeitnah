import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export class ChannelPreferences {
  @Prop({ type: Boolean, default: true })
  inApp!: boolean;

  @Prop({ type: Boolean, default: false })
  email!: boolean;

  @Prop({ type: Boolean, default: false })
  push!: boolean;
}

@Schema({
  timestamps: true,
  collection: 'notification_preferences',
})
export class NotificationPreference {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: true, push: true }) })
  social!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: true, push: true }) })
  learning!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: true, push: true }) })
  course!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: false, push: true }) })
  achievement!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: false, push: false }) })
  community!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: true, push: true }) })
  organization!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: true, push: true }) })
  opportunity!: ChannelPreferences;

  @Prop({ type: ChannelPreferences, default: () => ({ inApp: true, email: true, push: true }) })
  announcement!: ChannelPreferences;

  // Security preferences are strictly locked to inApp=true, email=true for account safety
  @Prop({
    type: Object,
    default: () => ({ inApp: true, email: true, push: true }),
  })
  security!: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
}

export const NotificationPreferenceSchema =
  SchemaFactory.createForClass(NotificationPreference);
