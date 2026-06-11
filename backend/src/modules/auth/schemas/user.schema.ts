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

export type UserGamificationActivity = {
  type: string;
  label: string;
  points: number;
  metadata: Record<string, any>;
  createdAt: Date;
};

export type UserGamification = {
  totalPoints: number;
  level: number;
  rank: string;
  completedCourses: number;
  completedClasses: number;
  totalWatchMinutes: number;
  profileCompletion: number;
  achievements: string[];
  rewardedClassIds: string[];
  rewardedCourseIds: string[];
  profileCompletionRewards: number[];
  activityDates: string[];
  recentActivities: UserGamificationActivity[];
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

          completedClasses: {
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
              completedAt: {
                type: Date,
                default: null,
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

      completedClasses: number;

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

      completedAt?: Date | null;
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
      totalPoints: {
        type: Number,
        default: 0,
      },
      level: {
        type: Number,
        default: 1,
      },
      rank: {
        type: String,
        default: 'Beginner',
      },
      completedCourses: {
        type: Number,
        default: 0,
      },
      completedClasses: {
        type: Number,
        default: 0,
      },
      totalWatchMinutes: {
        type: Number,
        default: 0,
      },
      profileCompletion: {
        type: Number,
        default: 0,
      },
      achievements: {
        type: [String],
        default: [],
      },
      rewardedClassIds: {
        type: [String],
        default: [],
      },
      rewardedCourseIds: {
        type: [String],
        default: [],
      },
      profileCompletionRewards: {
        type: [Number],
        default: [],
      },
      activityDates: {
        type: [String],
        default: [],
      },
      recentActivities: {
        type: [
          {
            type: {
              type: String,
              default: '',
            },
            label: {
              type: String,
              default: '',
            },
            points: {
              type: Number,
              default: 0,
            },
            metadata: {
              type: Object,
              default: {},
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        default: [],
      },
    },
    default: {},
  })
  gamification!: UserGamification;

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
