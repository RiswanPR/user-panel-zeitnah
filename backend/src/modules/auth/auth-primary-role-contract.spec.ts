import mongoose from 'mongoose';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { mapPrimaryRoleToLegacyRole } from '../profile/profile.service';
import { UserSchema, normalizeLegacyRoleValue } from './schemas/user.schema';
import {
  normalizeCanonicalPrimaryRole,
  normalizeCanonicalPrimaryRoleWithFallback,
  isCanonicalCommunityRole,
  CANONICAL_COMMUNITY_ROLES,
} from '../../common/utils/role-normalization.util';

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

  it('TEST 1 & 2: Legacy FOUNDER account in DB → JwtStrategy validates and normalizes canonical primaryRole as RECRUITER', async () => {
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

    // Phase 2A: legacy FOUNDER normalizes to canonical RECRUITER
    expect(result.primaryRole).toBe('RECRUITER');
    expect(result.role).toBe('recruiter');
    expect(result.userId).toBe('user_founder_1');
    expect(result.id).toBe('user_founder_1');
  });

  it('TEST 2B: Legacy MENTOR account in DB → JwtStrategy validates and normalizes canonical primaryRole as PROFESSIONAL', async () => {
    const futureExpiry = new Date(Date.now() + 10000000);
    const mockMentor = {
      _id: 'user_mentor_1',
      name: 'Dr. Emily Stones',
      email: 'mentor@zeitnah.com',
      username: 'emily_mentor',
      usernameClaimed: true,
      primaryRole: 'MENTOR',
      role: 'student',
      mentorship: {
        isAvailableForMentorship: true,
        topics: ['Structural Design'],
      },
      devices: [
        {
          deviceId: 'dev_mentor',
          refreshTokenExpiry: futureExpiry,
          lastSeen: new Date(),
        },
      ],
      account_Status: { isBlocked: false, isDeleted: false },
    };

    mockUserModel.findById.mockResolvedValue(mockMentor);

    const result = await jwtStrategy.validate({
      userId: 'user_mentor_1',
      deviceId: 'dev_mentor',
      role: 'student',
    });

    // Phase 2A: legacy MENTOR normalizes to canonical PROFESSIONAL
    expect(result.primaryRole).toBe('PROFESSIONAL');
    expect(result.role).toBe('student');
    expect(result.userId).toBe('user_mentor_1');
  });

  it('TEST 3: /auth/me returns canonical primaryRole for authenticated user', async () => {
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
        primaryRole: 'RECRUITER',
        role: 'recruiter',
        deviceId: 'dev_123',
      },
    };

    const res = await controller.getMe(authenticatedReq);
    expect(res.success).toBe(true);
    expect(res.user.primaryRole).toBe('RECRUITER');
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
      course: [
        { courseId: 'course_201', courseName: 'Geotechnical Soil Mechanics' },
      ],
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
    expect(mapPrimaryRoleToLegacyRole('PROFESSIONAL', 'superuser')).toBe(
      'superuser',
    );
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

  describe('Phase 2A Role Normalization Engine', () => {
    it('normalizes legacy FOUNDER / founder / casing and whitespace to RECRUITER', () => {
      expect(normalizeCanonicalPrimaryRole('FOUNDER')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRole('founder')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRole(' Founder ')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRole('FoUnDeR')).toBe('RECRUITER');
    });

    it('normalizes legacy MENTOR / mentor / casing and whitespace to PROFESSIONAL', () => {
      expect(normalizeCanonicalPrimaryRole('MENTOR')).toBe('PROFESSIONAL');
      expect(normalizeCanonicalPrimaryRole('mentor')).toBe('PROFESSIONAL');
      expect(normalizeCanonicalPrimaryRole(' Mentor ')).toBe('PROFESSIONAL');
      expect(normalizeCanonicalPrimaryRole('MeNtOr')).toBe('PROFESSIONAL');
    });

    it('preserves canonical roles unchanged', () => {
      expect(normalizeCanonicalPrimaryRole('STUDENT')).toBe('STUDENT');
      expect(normalizeCanonicalPrimaryRole('student')).toBe('STUDENT');
      expect(normalizeCanonicalPrimaryRole(' Student ')).toBe('STUDENT');
      expect(normalizeCanonicalPrimaryRole('PROFESSIONAL')).toBe('PROFESSIONAL');
      expect(normalizeCanonicalPrimaryRole('professional')).toBe('PROFESSIONAL');
      expect(normalizeCanonicalPrimaryRole('RECRUITER')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRole('recruiter')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRole('EDUCATOR')).toBe('EDUCATOR');
      expect(normalizeCanonicalPrimaryRole('educator')).toBe('EDUCATOR');
      expect(normalizeCanonicalPrimaryRole('TEACHER')).toBe('EDUCATOR');
      expect(normalizeCanonicalPrimaryRole('teacher')).toBe('EDUCATOR');
    });

    it('identifies system ADMIN role without confusing it with community roles', () => {
      expect(normalizeCanonicalPrimaryRole('ADMIN')).toBe('ADMIN');
      expect(normalizeCanonicalPrimaryRole('admin')).toBe('ADMIN');
      expect(isCanonicalCommunityRole('ADMIN')).toBe(false);
      expect(isCanonicalCommunityRole('admin')).toBe(false);
    });

    it('returns undefined for missing, invalid, or unknown role strings (safeguard against privilege escalation)', () => {
      expect(normalizeCanonicalPrimaryRole(null)).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole(undefined)).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole('')).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole('   ')).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole('superman')).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole('hacker')).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole('CEO')).toBeUndefined();
      expect(normalizeCanonicalPrimaryRole('root')).toBeUndefined();
    });

    it('normalizeCanonicalPrimaryRoleWithFallback uses legacy LMS role as fallback', () => {
      expect(normalizeCanonicalPrimaryRoleWithFallback(null, 'teacher')).toBe('EDUCATOR');
      expect(normalizeCanonicalPrimaryRoleWithFallback(undefined, 'recruiter')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRoleWithFallback('', 'student')).toBe('STUDENT');
      expect(normalizeCanonicalPrimaryRoleWithFallback('founder', 'student')).toBe('RECRUITER');
      expect(normalizeCanonicalPrimaryRoleWithFallback(null, null)).toBe('STUDENT');
    });

    it('isCanonicalCommunityRole validates only canonical roles', () => {
      expect(isCanonicalCommunityRole('STUDENT')).toBe(true);
      expect(isCanonicalCommunityRole('PROFESSIONAL')).toBe(true);
      expect(isCanonicalCommunityRole('RECRUITER')).toBe(true);
      expect(isCanonicalCommunityRole('EDUCATOR')).toBe(true);
      expect(isCanonicalCommunityRole('FOUNDER')).toBe(false);
      expect(isCanonicalCommunityRole('MENTOR')).toBe(false);
      expect(isCanonicalCommunityRole('ADMIN')).toBe(false);
      expect(isCanonicalCommunityRole('student')).toBe(false); // must be canonical uppercase
      expect(isCanonicalCommunityRole(normalizeCanonicalPrimaryRole('student'))).toBe(true);
    });
  });
});
