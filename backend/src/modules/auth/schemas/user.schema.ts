import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
})
export class User {
  // EMAIL
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  // FULL NAME
  @Prop({
    trim: true,
    default: '',
  })
  name!: string;

  // ROLE
  @Prop({
    default: 'student',
    enum: ['student', 'teacher', 'admin', 'recruiter'],
  })
  role!: string;

  // OTP
  @Prop({
    type: String,
    default: null,
  })
  otp!: string | null;

  // OTP EXPIRY
  @Prop({
    type: Date,
    default: null,
  })
  otpExpiry!: Date | null;

  // DEVICE IDS
  @Prop({
    type: [
      {
        deviceId: String,
        deviceType: String,
      },
    ],

    default: [],
  })
  devices!: {
    deviceId: string;

    deviceType: string;
  }[];

  // PROFILE IMAGE
  @Prop({
    default: '',
  })
  avatar!: string;

  // BIO
  @Prop({
    default: '',
  })
  bio!: string;

  // SKILLS
  @Prop({
    type: [String],
    default: [],
  })
  skills!: string[];

  // VERIFIED USER
  @Prop({
    default: false,
  })
  isVerified!: boolean;

  // ACCOUNT STATUS
  @Prop({
    default: true,
  })
  isActive!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
