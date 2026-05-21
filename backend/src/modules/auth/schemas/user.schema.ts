import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { Document } from 'mongoose';

export type UserDocument =
  User & Document;

@Schema({
  timestamps: true,
})

export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    trim: true,
  })
  name!: string;

  @Prop({
    default: 'student',
    enum: [
      'student',
      'teacher',
      'admin',
    ],
  })
  role!: string;

  @Prop({
    type: String,
    default: null,
  })
  otp!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  otpExpiry!: Date | null;
}

export const UserSchema =
  SchemaFactory.createForClass(User);