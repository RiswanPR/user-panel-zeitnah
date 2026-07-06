import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document } from 'mongoose';

export type ActiveStreamDocument = ActiveStream & Document;

@Schema({
  timestamps: true,
})
export class ActiveStream {
  @Prop({
    required: true,
  })
  userId!: string;

  @Prop({
    required: true,
  })
  classId!: string;

  @Prop({
    required: true,
  })
  deviceId!: string;

  @Prop({
    required: false,
  })
  browserFingerprint?: string;

  @Prop({
    required: false,
  })
  ipAddress?: string;

  @Prop({
    required: false,
  })
  userAgent?: string;

  @Prop({
    type: String,
    enum: ['ACTIVE', 'ENDED', 'EXPIRED'],
    default: 'ACTIVE',
  })
  status!: string;

  @Prop({
    default: Date.now,
  })
  heartbeatAt!: Date;

  @Prop({
    type: Date,
    expires: 0,
    required: true,
  })
  expiresAt!: Date;
}

export const ActiveStreamSchema = SchemaFactory.createForClass(ActiveStream);
