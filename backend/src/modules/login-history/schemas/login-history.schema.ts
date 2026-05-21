import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

export type LoginHistoryDocument =
  LoginHistory & Document;

@Schema({
  timestamps: true,
})

export class LoginHistory {

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })

  user!: Types.ObjectId;

  @Prop({
    required: true,
  })

  deviceId!: string;

  @Prop({
    required: true,
  })

  deviceType!: string;

  @Prop({
    default: '',
  })

  browser!: string;

  @Prop({
    default: '',
  })

  ipAddress!: string;

  @Prop({
    default: true,
  })

  isActive!: boolean;

}

export const LoginHistorySchema =
  SchemaFactory.createForClass(
    LoginHistory,
  );