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
  previousRefreshToken?: string | null;
};

export type PushDevice = {
  deviceId: string;
  platform: string;
  pushToken: string;
  enabled: boolean;
  updatedAt: Date;
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
  rewardedMilestones?: string[];
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

  // USERNAME
  @Prop({
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  })
  username!: string;

  // USERNAME CLAIM STATUS (Determines whether first-time claim modal is shown)
  @Prop({
    default: false,
    type: Boolean,
  })
  usernameClaimed!: boolean;

  // USERNAME LAST CHANGED AT (For 14-day cooldown enforcement)
  @Prop({
    type: Date,
    default: null,
  })
  usernameChangedAt?: Date | null;

  // USERNAME HISTORY (Audit / security tracking)
  @Prop({
    type: [
      {
        username: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  usernameHistory?: Array<{ username: string; changedAt: Date }>;

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

        previousRefreshToken: {
          type: String,
          default: null,
        },
      },
    ],

    default: [],
  })
  devices!: UserDevice[];

  // =========================
  // PUSH NOTIFICATION DEVICES
  // =========================

  @Prop({
    type: [
      {
        deviceId: { type: String, required: true },
        platform: { type: String, default: 'android' },
        pushToken: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  pushDevices!: PushDevice[];

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

  // BACKGROUND / COVER IMAGE
  @Prop({
    default: '',
  })
  backgroundImage!: string;

  // HEADLINE
  @Prop({
    default: '',
    trim: true,
  })
  headline!: string;

  // CURRENT ROLE
  @Prop({
    default: '',
    trim: true,
  })
  currentRole!: string;

  // LOCATION
  @Prop({
    default: '',
    trim: true,
  })
  location!: string;

  // INDUSTRY
  @Prop({
    default: '',
    trim: true,
  })
  industry!: string;

  // PUBLIC PROFILE PUBLISHED STATUS
  @Prop({
    default: false,
    type: Boolean,
  })
  publicProfilePublished!: boolean;

  // ECOSYSTEM PRIMARY ROLE (Authoritative)
  @Prop({
    default: 'STUDENT',
    enum: [
      'STUDENT',
      'EDUCATOR',
      'PROFESSIONAL',
      'MENTOR',
      'RECRUITER',
      'FOUNDER',
    ],
  })
  primaryRole!: string;

  // ECOSYSTEM CAPABILITIES
  @Prop({
    type: [String],
    default: ['STUDENT'],
  })
  capabilities!: string[];

  // PROFESSIONAL AVAILABILITY
  @Prop({
    default: 'NOT_CURRENTLY_AVAILABLE',
    enum: [
      'OPEN_TO_OPPORTUNITIES',
      'AVAILABLE_FOR_MENTORSHIP',
      'AVAILABLE_FOR_COLLABORATION',
      'NOT_CURRENTLY_AVAILABLE',
    ],
  })
  availability!: string;

  // PROFESSIONAL INTERESTS
  @Prop({
    type: [String],
    default: [],
  })
  professionalInterests!: string[];

  // RECRUITER DISCOVERABILITY (Explicit user control)
  @Prop({
    default: false,
    type: Boolean,
  })
  discoverableToRecruiters!: boolean;

  // GRANULAR PROFILE VISIBILITY
  @Prop({
    default: 'PUBLIC',
    enum: ['PUBLIC', 'NETWORK', 'VERIFIED_RECRUITERS', 'PRIVATE'],
  })
  profileVisibility!: string;

  // PRIMARY INFRASTRUCTURE DISCIPLINE
  @Prop({
    default: '',
    trim: true,
  })
  primaryDiscipline!: string;

  // INFRASTRUCTURE SPECIALIZATIONS
  @Prop({
    type: [String],
    default: [],
  })
  specializations!: string[];

  // INFRASTRUCTURE SECTORS
  @Prop({
    type: [String],
    default: [],
  })
  infrastructureSectors!: string[];

  // PREFERRED WORK LOCATIONS
  @Prop({
    type: [String],
    default: [],
  })
  preferredLocations!: string[];

  // YEARS OF EXPERIENCE IN INFRASTRUCTURE
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  yearsOfExperience!: number;

  // STRUCTURED SKILLS TAXONOMY
  @Prop({
    type: {
      technicalSkills: { type: [String], default: [] },
      softwareSkills: { type: [String], default: [] },
      industrySkills: { type: [String], default: [] },
      professionalSkills: { type: [String], default: [] },
    },
    default: {
      technicalSkills: [],
      softwareSkills: [],
      industrySkills: [],
      professionalSkills: [],
    },
  })
  structuredSkills!: {
    technicalSkills: string[];
    softwareSkills: string[];
    industrySkills: string[];
    professionalSkills: string[];
  };

  // CAREER PREFERENCES FOR AI MATCHING
  @Prop({
    type: {
      openToOpportunities: { type: Boolean, default: false },
      preferredRoles: { type: [String], default: [] },
      preferredSectors: { type: [String], default: [] },
      preferredLocations: { type: [String], default: [] },
      preferredWorkMode: { type: String, default: 'On-site' },
      preferredEmploymentType: { type: String, default: 'Full-time' },
      expectedSalaryRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        period: { type: String, default: 'yearly' },
      },
      availability: { type: String, default: '' },
    },
    default: {
      openToOpportunities: false,
      preferredRoles: [],
      preferredSectors: [],
      preferredLocations: [],
      preferredWorkMode: 'On-site',
      preferredEmploymentType: 'Full-time',
      expectedSalaryRange: {
        min: 0,
        max: 0,
        currency: 'INR',
        period: 'yearly',
      },
      availability: '',
    },
  })
  careerPreferences!: {
    openToOpportunities: boolean;
    preferredRoles: string[];
    preferredSectors: string[];
    preferredLocations: string[];
    preferredWorkMode: string;
    preferredEmploymentType: string;
    expectedSalaryRange: {
      min: number;
      max: number;
      currency: string;
      period: string;
    };
    availability: string;
  };

  // GRANULAR PRIVACY SETTINGS
  @Prop({
    type: {
      experience: { type: String, default: 'PUBLIC' },
      education: { type: String, default: 'PUBLIC' },
      projects: { type: String, default: 'PUBLIC' },
      certifications: { type: String, default: 'PUBLIC' },
      careerPreferences: { type: String, default: 'PRIVATE' },
      contactInfo: { type: String, default: 'NETWORK' },
    },
    default: {
      experience: 'PUBLIC',
      education: 'PUBLIC',
      projects: 'PUBLIC',
      certifications: 'PUBLIC',
      careerPreferences: 'PRIVATE',
      contactInfo: 'NETWORK',
    },
  })
  privacySettings!: {
    experience: string;
    education: string;
    projects: string;
    certifications: string;
    careerPreferences: string;
    contactInfo: string;
  };

  // MENTORSHIP CONTEXT
  @Prop({
    type: {
      topics: { type: [String], default: [] },
      expertise: { type: [String], default: [] },
      bio: { type: String, default: '' },
      available: { type: Boolean, default: false },
    },
    default: { topics: [], expertise: [], bio: '', available: false },
  })
  mentorship!: {
    topics: string[];
    expertise: string[];
    bio: string;
    available: boolean;
  };

  // RECRUITER CONTEXT
  @Prop({
    type: {
      organizationId: { type: String, default: '' },
      hiringInterests: { type: [String], default: [] },
      opportunityTypes: { type: [String], default: [] },
    },
    default: { organizationId: '', hiringInterests: [], opportunityTypes: [] },
  })
  recruiterContext!: {
    organizationId?: string;
    hiringInterests: string[];
    opportunityTypes: string[];
  };

  // EDUCATOR CONTEXT
  @Prop({
    type: {
      subjects: { type: [String], default: [] },
      expertise: { type: [String], default: [] },
      institution: { type: String, default: '' },
    },
    default: { subjects: [], expertise: [], institution: '' },
  })
  educatorContext!: {
    subjects: string[];
    expertise: string[];
    institution?: string;
  };

  // VERIFICATION CONTEXT (Factual, backend-controlled)
  @Prop({
    type: {
      status: {
        type: String,
        enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REVOKED'],
        default: 'UNVERIFIED',
      },
      verificationType: { type: String, default: 'IDENTITY' },
      verifiedAt: { type: Date, default: null },
    },
    default: {
      status: 'UNVERIFIED',
      verificationType: 'IDENTITY',
      verifiedAt: null,
    },
  })
  verification!: {
    status: string;
    verificationType: string;
    verifiedAt?: Date | null;
  };

  // EXPERIENCE
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        organization: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        employmentType: { type: String, default: 'Full-time' },
        location: { type: String, default: '' },
        startDate: { type: Date, required: true },
        endDate: { type: Date, default: null },
        currentlyActive: { type: Boolean, default: false },
        description: { type: String, default: '' },
        skillsUsed: { type: [String], default: [] },
        softwareUsed: { type: [String], default: [] },
        infrastructureSector: { type: String, default: '' },
      },
    ],
    default: [],
  })
  experience!: Array<{
    id: string;
    organization: string;
    role: string;
    employmentType: string;
    location: string;
    startDate: Date;
    endDate: Date | null;
    currentlyActive: boolean;
    description: string;
    skillsUsed?: string[];
    softwareUsed?: string[];
    infrastructureSector?: string;
  }>;

  // EDUCATION
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        institution: { type: String, required: true, trim: true },
        qualification: { type: String, required: true, trim: true },
        fieldOfStudy: { type: String, default: '' },
        startDate: { type: Date, required: true },
        endDate: { type: Date, default: null },
        currentlyStudying: { type: Boolean, default: false },
        description: { type: String, default: '' },
      },
    ],
    default: [],
  })
  education!: Array<{
    id: string;
    institution: string;
    qualification: string;
    fieldOfStudy: string;
    startDate: Date;
    endDate: Date | null;
    currentlyStudying: boolean;
    description: string;
  }>;

  // CERTIFICATIONS
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        issuer: { type: String, required: true, trim: true },
        issueDate: { type: Date, required: true },
        expirationDate: { type: Date, default: null },
        credentialId: { type: String, default: '' },
        credentialUrl: { type: String, default: '' },
        status: {
          type: String,
          enum: ['UNVERIFIED', 'VERIFIED'],
          default: 'UNVERIFIED',
        },
      },
    ],
    default: [],
  })
  certifications!: Array<{
    id: string;
    name: string;
    issuer: string;
    issueDate: Date;
    expirationDate: Date | null;
    credentialId: string;
    credentialUrl: string;
    status?: string;
  }>;

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
      rewardedMilestones: {
        type: [String],
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

// Indexes for high-frequency LMS queries
UserSchema.index(
  { username: 1 },
  {
    unique: true,
    sparse: true,
    collation: { locale: 'en', strength: 2 },
  },
);
UserSchema.index({ 'course.courseId': 1 });
UserSchema.index({
  'gamification.totalPoints': -1,
  'gamification.level': -1,
  'gamification.completedClasses': -1,
  createdAt: 1,
});
UserSchema.index({ primaryRole: 1 });
UserSchema.index({ primaryDiscipline: 1 });
UserSchema.index({ infrastructureSectors: 1 });
UserSchema.index({ yearsOfExperience: 1 });
