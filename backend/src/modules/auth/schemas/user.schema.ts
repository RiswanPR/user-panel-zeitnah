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

  // =========================
// USER COURSES
// =========================

@Prop({
  type: [
    {
      courseId: String,

      courseName: String,

      courseFee: String,

      Start_Date: Date,

      End_Date: Date,

      duration: String,

      learningProgress: {

        totalClasses: {
          type: Number,
          default: 0,
        },

        watchedClasses: {
          type: Number,
          default: 0,
        },

        completionPercent: {
          type: Number,
          default: 0,
        },

        streak: {
          type: Number,
          default: 0,
        },

        averageWatchTime: {
          type: String,
          default: '',
        },

        certificateEligible: {
          type: Boolean,
          default: false,
        },

      },

      classProgress: {
        type: [
          {
            classId: String,

            chapterCode: {
              type: String,
              default: '',
            },

            watchedSeconds: {
              type: Number,
              default: 0,
            },

            coveredSeconds: {
              type: Number,
              default: 0,
            },

            lastPositionSeconds: {
              type: Number,
              default: 0,
            },

            durationSeconds: {
              type: Number,
              default: 0,
            },

            progressPercent: {
              type: Number,
              default: 0,
            },

            completed: {
              type: Boolean,
              default: false,
            },

            startedAt: {
              type: Date,
              default: Date.now,
            },

            lastWatchedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],

        default: [],
      },

      activityDates: {
        type: [String],
        default: [],
      },

    },
  ],

  default: [],
})

course!: {

  courseId: string;

  courseName: string;

  courseFee: string;

  Start_Date: Date;

  End_Date: Date;

  duration: string;

  learningProgress: {

    totalClasses: number;

    watchedClasses: number;

    completionPercent: number;

    streak: number;

    averageWatchTime: string;

    certificateEligible: boolean;

  };

  classProgress?: {

    classId: string;

    chapterCode: string;

    watchedSeconds: number;

    coveredSeconds: number;

    lastPositionSeconds: number;

    durationSeconds: number;

    progressPercent: number;

    completed: boolean;

    startedAt: Date;

    lastWatchedAt: Date;

  }[];

  activityDates?: string[];

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
  
@Prop({
  type: {
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  default: {},
})
account_Status!: {
  isVerified: boolean;
  isActive: boolean;
  lastSeen: Date;
  isBlocked: boolean;
  isDeleted: boolean;
};
}
export const UserSchema = SchemaFactory.createForClass(User);
