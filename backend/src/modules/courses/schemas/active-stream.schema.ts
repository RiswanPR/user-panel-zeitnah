import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
} from 'mongoose';

export type ActiveStreamDocument =
  ActiveStream &
  Document;

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
    default: Date.now,
  })
  heartbeatAt!: Date;

}

export const ActiveStreamSchema =
  SchemaFactory.createForClass(
    ActiveStream,
  );