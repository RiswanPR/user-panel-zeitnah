import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document } from 'mongoose';

export type UserDocument = User & Document;

export type UserDevice = {
  deviceId: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastSeen: Date;
  refreshToken: string | null;
  refreshTokenExpiry: Date | null;
};

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

  // ACTIVE DEVICES / SESSIONS
  @Prop({
    type: [
      {
        deviceId: String,

        deviceType: String,

        browser: {
          type: String,
          default: '',
        },

        os: {
          type: String,
          default: '',
        },

        ip: {
          type: String,
          default: '',
        },

        location: {
          type: String,
          default: '',
        },

        lastSeen: {
          type: Date,
          default: Date.now,
        },

        refreshToken: {
          type: String,
          default: null,
        },

        refreshTokenExpiry: {
          type: Date,
          default: null,
        },
      },
    ],

    default: [],
  })
  devices!: UserDevice[];

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

  @Prop({
    default: Date.now,
  })
  lastSeen!: Date;

  @Prop({
    default: false,
  })
  isBlocked!: boolean;

  @Prop({
    default: false,
  })
  isDeleted!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
