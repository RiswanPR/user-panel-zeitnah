import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserPresenceDocument = UserPresence & Document;

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
}

@Schema({ timestamps: true, collection: 'community_user_presences' })
export class UserPresence {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  userId: string;

  @Prop({
    type: String,
    enum: Object.values(PresenceStatus),
    default: PresenceStatus.OFFLINE,
  })
  status: PresenceStatus;

  @Prop({ type: Date, default: Date.now })
  lastSeen: Date;
}

export const UserPresenceSchema = SchemaFactory.createForClass(UserPresence);
