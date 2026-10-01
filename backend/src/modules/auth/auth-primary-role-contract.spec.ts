import mongoose from 'mongoose';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { mapPrimaryRoleToLegacyRole } from '../profile/profile.service';
import {
  UserSchema,
  normalizeLegacyRoleValue,
} from './schemas/user.schema';

describe('Auth Primary Role Contract & Identity Regression Tests', () => {
  let jwtStrategy: JwtStrategy;
  let mockUserModel: any;

  beforeEach(() => {
    mockUserModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    jwtStrategy = new JwtStrategy(mockUserModel);
  });

  it('TEST 1 & 2: FOUNDER + course enrollment → JwtStrategy validates canonical primaryRole as FOUNDER', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockFounder = {
      _id: 'user_founder_1',
      name: 'Farooq Al-Sayed',
      email: 'founder@zeitnah.com',
      username: 'farooq',
      usernameClaimed: true,
      primaryRole: 'FOUNDER',
      role: 'recruiter',
      course: [
        { courseId: 'course_101', courseName: 'Advanced BIM Modeling' },
        { courseId: 'course_102', courseName: 'Highway Engineering' },
      ],
      devices: [
        {
          deviceId: 'dev_123',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockFounder);

    const result = await jwtStrategy.validate({
      userId: 'user_founder_1',
      deviceId: 'dev_123',
      role: 'recruiter',
    });

    expect(result.primaryRole).toBe('FOUNDER');
    expect(result.role).toBe('recruiter');
    expect(result.userId).toBe('user_founder_1');
    expect(result.id).toBe('user_founder_1');
  });

  it('TEST 3: /auth/me returns canonical primaryRole for FOUNDER + course enrollment', () => {
    const mockAuthService = {} as AuthService;
    const controller = new AuthController(mockAuthService);

    const authenticatedReq: any = {
      user: {
        userId: 'user_founder_1',
        id: 'user_founder_1',
        name: 'Farooq Al-Sayed',
        email: 'founder@zeitnah.com',
        username: 'farooq',
        usernameClaimed: true,
        primaryRole: 'FOUNDER',
        role: 'recruiter',
        deviceId: 'dev_123',
      },
    };

    const res = controller.getMe(authenticatedReq);
    expect(res.success).toBe(true);
    expect(res.user.primaryRole).toBe('FOUNDER');
    expect(res.user.id).toBe('user_founder_1');
    expect(res.user.email).toBe('founder@zeitnah.com');
  });

  it('TEST 4 & 5: RECRUITER + course enrollment → JwtStrategy validates canonical primaryRole as RECRUITER', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockRecruiter = {
      _id: 'user_recruiter_1',
      name: 'Sarah Connor',
      email: 'recruiter@zeitnah.com',
      username: 'sarah',
      usernameClaimed: true,
      primaryRole: 'RECRUITER',
      role: 'recruiter',
      course: [{ courseId: 'course_201', courseName: 'Geotechnical Soil Mechanics' }],
      devices: [
        {
          deviceId: 'dev_recruiter',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockRecruiter);

    const result = await jwtStrategy.validate({
      userId: 'user_recruiter_1',
      deviceId: 'dev_recruiter',
      role: 'recruiter',
    });

    expect(result.primaryRole).toBe('RECRUITER');
    expect(result.role).toBe('recruiter');
  });

  it('TEST 7: PROFESSIONAL + course enrollment → JwtStrategy validates canonical primaryRole as PROFESSIONAL', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockProfessional = {
      _id: 'user_pro_1',
      name: 'John Engineer',
      email: 'john@zeitnah.com',
      username: 'john_pro',
      primaryRole: 'PROFESSIONAL',
      role: 'student',
      course: [{ courseId: 'c1' }, { courseId: 'c2' }],
      devices: [
        {
          deviceId: 'dev_pro',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockProfessional);

    const result = await jwtStrategy.validate({
      userId: 'user_pro_1',
      deviceId: 'dev_pro',
      role: 'student',
    });

    expect(result.primaryRole).toBe('PROFESSIONAL');
    expect(result.role).toBe('student');
  });

  it('TEST 8: STUDENT + course enrollment → validates canonical primaryRole as STUDENT', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockStudent = {
      _id: 'user_stu_1',
      name: 'Alex Student',
      email: 'alex@zeitnah.com',
      username: 'alex',
      primaryRole: 'STUDENT',
      role: 'student',
      course: [{ courseId: 'c1' }],
      devices: [
        {
          deviceId: 'dev_stu',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockStudent);

    const result = await jwtStrategy.validate({
      userId: 'user_stu_1',
      deviceId: 'dev_stu',
      role: 'student',
    });

    expect(result.primaryRole).toBe('STUDENT');
  });

  it('TEST 9: EDUCATOR + course enrollment → validates canonical primaryRole as EDUCATOR', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockEducator = {
      _id: 'user_edu_1',
      name: 'Prof. Miller',
      email: 'miller@zeitnah.com',
      username: 'prof_miller',
      primaryRole: 'EDUCATOR',
      role: 'teacher',
      course: [{ courseId: 'c1' }],
      devices: [
        {
          deviceId: 'dev_edu',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockEducator);

    const result = await jwtStrategy.validate({
      userId: 'user_edu_1',
      deviceId: 'dev_edu',
      role: 'teacher',
    });

    expect(result.primaryRole).toBe('EDUCATOR');
    expect(result.role).toBe('teacher');
  });

  it('TEST 11: mapPrimaryRoleToLegacyRole maintains safe synchronization without corrupting roles', () => {
    // FOUNDER maps to recruiter in legacy systems (not student!)
    expect(mapPrimaryRoleToLegacyRole('FOUNDER')).toBe('recruiter');
    // RECRUITER maps to recruiter in legacy systems (not student!)
    expect(mapPrimaryRoleToLegacyRole('RECRUITER')).toBe('recruiter');
    // EDUCATOR maps to teacher in legacy systems
    expect(mapPrimaryRoleToLegacyRole('EDUCATOR')).toBe('teacher');
    // STUDENT, PROFESSIONAL, MENTOR map to student
    expect(mapPrimaryRoleToLegacyRole('STUDENT')).toBe('student');
    expect(mapPrimaryRoleToLegacyRole('PROFESSIONAL')).toBe('student');
    expect(mapPrimaryRoleToLegacyRole('MENTOR')).toBe('student');
    // Admin legacy privilege is strictly preserved
    expect(mapPrimaryRoleToLegacyRole('STUDENT', 'admin')).toBe('admin');
    expect(mapPrimaryRoleToLegacyRole('PROFESSIONAL', 'superuser')).toBe('superuser');
  });

  it('TEST 12: Legacy accounts missing primaryRole fallback gracefully to canonical role', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockLegacyTeacher = {
      _id: 'user_legacy_t',
      name: 'Legacy Teacher',
      email: 'teacher@zeitnah.com',
      username: 'teacher',
      // primaryRole genuinely missing in old document
      role: 'teacher',
      devices: [
        {
          deviceId: 'dev_leg',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockLegacyTeacher);

    const result = await jwtStrategy.validate({
      userId: 'user_legacy_t',
      deviceId: 'dev_leg',
      role: 'teacher',
    });

    expect(result.primaryRole).toBe('EDUCATOR');
    expect(result.role).toBe('teacher');
  });

  it('TEST 13: normalizeLegacyRoleValue correctly maps non-canonical role strings to valid schema enum', () => {
    expect(normalizeLegacyRoleValue('educator')).toBe('teacher');
    expect(normalizeLegacyRoleValue('EDUCATOR')).toBe('teacher');
    expect(normalizeLegacyRoleValue('professional')).toBe('student');
    expect(normalizeLegacyRoleValue('PROFESSIONAL')).toBe('student');
    expect(normalizeLegacyRoleValue('mentor')).toBe('student');
    expect(normalizeLegacyRoleValue('founder')).toBe('recruiter');
    expect(normalizeLegacyRoleValue('student')).toBe('student');
    expect(normalizeLegacyRoleValue('teacher')).toBe('teacher');
    expect(normalizeLegacyRoleValue('admin')).toBe('admin');
    expect(normalizeLegacyRoleValue('recruiter')).toBe('recruiter');
  });

  it('TEST 14: UserSchema pre-validate hook normalizes role: "educator" to "teacher" preventing ValidationError', async () => {
    const UserModel = mongoose.model('TestUserValidation', UserSchema);
    const doc = new UserModel({
      name: 'Elena Rostova',
      email: 'elena@zeitnah.test',
      username: 'erostova_test',
      role: 'educator',
      primaryRole: 'EDUCATOR',
    });

    await doc.validate();
    expect(doc.role).toBe('teacher');
    expect(doc.primaryRole).toBe('EDUCATOR');
  });
});
