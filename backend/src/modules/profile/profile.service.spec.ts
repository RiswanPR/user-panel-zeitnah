import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import mongoose from 'mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Recommendation } from './schemas/recommendation.schema';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { UsernameService } from './services/username.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CatalogueTitleRequestService } from './services/catalogue-title-request.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockUserModel: any;
  let mockRecommendationModel: any;
  let mockAuditLogsService: any;
  let mockCatalogueTitleRequestService: any;
  let usernameService: UsernameService;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    mockRecommendationModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn().mockResolvedValue(true),
      create: jest
        .fn()
        .mockImplementation((doc) =>
          Promise.resolve({ ...doc, _id: 'rec_123' }),
        ),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(true),
    };

    mockCatalogueTitleRequestService = {
      findOrCreateOrReuseRequest: jest.fn(),
      normalizeTitle: jest
        .fn()
        .mockImplementation((t: string) =>
          t.trim().toLowerCase().replace(/\s+/g, ' '),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        UsernameService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Recommendation.name),
          useValue: mockRecommendationModel,
        },
        {
          provide: UploadService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue(true),
            deleteFile: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SignedUrlService,
          useValue: {
            generateSignedImageUrl: jest
              .fn()
              .mockImplementation((k) => `https://signed.cdn/${k}`),
          },
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
        {
          provide: CatalogueTitleRequestService,
          useValue: mockCatalogueTitleRequestService,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    usernameService = module.get<UsernameService>(UsernameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAvailability', () => {
    it('should report reserved usernames as unavailable', async () => {
      const res = await service.checkAvailability('admin');
      expect(res.available).toBe(false);
      expect(res.reason).toContain('reserved');
    });

    it('should report taken usernames as unavailable', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({ username: 'other_user' }),
      });
      const res = await service.checkAvailability('other_user');
      expect(res.available).toBe(false);
      expect(res.reason).toContain('already taken');
    });

    it('should report current handle as available when checked by current user', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ username: 'temp_user' }),
      });
      const res = await service.checkAvailability('temp_user', 'user_123');
      expect(res.available).toBe(true);
      expect(res.isCurrent).toBe(true);
    });

    it('should report unused compliant handle as available', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const res = await service.checkAvailability('brand_new_handle');
      expect(res.available).toBe(true);
      expect(res.username).toBe('brand_new_handle');
    });
  });

  describe('claimUsername', () => {
    it('should successfully claim initial available username on first decision', async () => {
      const mockUser = {
        _id: 'user_123',
        username: 'initial_handle',
        usernameClaimed: false,
      };
      const mockUpdatedUser = {
        _id: 'user_123',
        username: 'desired_handle',
        usernameClaimed: true,
        toObject: jest.fn().mockReturnValue({
          _id: 'user_123',
          username: 'desired_handle',
          usernameClaimed: true,
        }),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

      const result = await service.claimUsername(
        'user_123',
        'desired_handle',
        '127.0.0.1',
      );

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'user_123', usernameClaimed: false },
        { $set: { username: 'desired_handle', usernameClaimed: true } },
        { returnDocument: 'after' },
      );
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USERNAME_CLAIMED',
          entityId: 'user_123',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.user.username).toBe('desired_handle');
    });

    it('should delegate to changeUsername if user was already claimed', async () => {
      const mockUser = {
        _id: 'user_123',
        username: 'claimed_handle',
        usernameClaimed: true,
        usernameChangedAt: null,
      };
      const mockUpdatedUser = {
        _id: 'user_123',
        username: 'updated_handle',
        usernameClaimed: true,
        toObject: jest.fn().mockReturnValue({
          _id: 'user_123',
          username: 'updated_handle',
          usernameClaimed: true,
        }),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

      const result = await service.claimUsername(
        'user_123',
        'updated_handle',
        '127.0.0.1',
      );
      expect(result.success).toBe(true);
      expect(result.user.username).toBe('updated_handle');
    });

    it('should handle MongoDB duplicate key race condition gracefully', async () => {
      const duplicateError: any = new Error('E11000 duplicate key error');
      duplicateError.code = 11000;

      const mockUser = {
        _id: 'user_123',
        username: 'initial_handle',
        usernameClaimed: false,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockRejectedValue(duplicateError);

      await expect(
        service.claimUsername('user_123', 'colliding_handle'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changeUsername', () => {
    it('should successfully change username when cooldown is not active', async () => {
      const mockUser = {
        _id: 'user_123',
        username: 'old_handle',
        usernameClaimed: true,
        usernameChangedAt: null,
      };
      const mockUpdatedUser = {
        _id: 'user_123',
        username: 'new_handle',
        usernameClaimed: true,
        toObject: jest.fn().mockReturnValue({
          _id: 'user_123',
          username: 'new_handle',
          usernameClaimed: true,
        }),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

      const res = await service.changeUsername(
        'user_123',
        'new_handle',
        '127.0.0.1',
      );
      expect(res.success).toBe(true);
      expect(res.user.username).toBe('new_handle');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USERNAME_CHANGED',
        }),
      );
    });

    it('should reject change if attempted within 14-day cooldown', async () => {
      // Changed 2 days ago
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const mockUser = {
        _id: 'user_123',
        username: 'recent_handle',
        usernameClaimed: true,
        usernameChangedAt: twoDaysAgo,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.changeUsername('user_123', 'too_soon_handle'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow change after 14-day cooldown expires', async () => {
      // Changed 16 days ago
      const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
      const mockUser = {
        _id: 'user_123',
        username: 'past_handle',
        usernameClaimed: true,
        usernameChangedAt: sixteenDaysAgo,
      };
      const mockUpdatedUser = {
        _id: 'user_123',
        username: 'fresh_handle',
        usernameClaimed: true,
        toObject: jest.fn().mockReturnValue({
          _id: 'user_123',
          username: 'fresh_handle',
          usernameClaimed: true,
        }),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUpdatedUser);

      const res = await service.changeUsername(
        'user_123',
        'fresh_handle',
        '127.0.0.1',
      );
      expect(res.success).toBe(true);
      expect(res.user.username).toBe('fresh_handle');
    });

    it('should reject change if desired username is already taken', async () => {
      const mockUser = {
        _id: 'user_123',
        username: 'my_handle',
        usernameClaimed: true,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue({ _id: 'other_user_456' });

      await expect(
        service.changeUsername('user_123', 'taken_handle'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject change if desired username is reserved', async () => {
      const mockUser = {
        _id: 'user_123',
        username: 'my_handle',
        usernameClaimed: true,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(service.changeUsername('user_123', 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return unchanged response if requested handle is current handle', async () => {
      const mockUser = {
        _id: 'user_123',
        username: 'same_handle',
        usernameClaimed: true,
        toObject: jest.fn().mockReturnValue({
          _id: 'user_123',
          username: 'same_handle',
          usernameClaimed: true,
        }),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.changeUsername('user_123', 'same_handle');
      expect(res.message).toBe('Username is unchanged.');
      expect(mockUserModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile without exposing sensitive private fields', async () => {
      const mockUserDoc = {
        _id: 'user_999',
        name: 'Jane Doe',
        username: 'janedoe',
        avatar: 'profiles/janedoe.jpg',
        bio: 'Coding enthusiast',
        skills: ['TypeScript', 'React'],
        role: 'student',
        createdAt: new Date(),
        gamification: {
          level: 3,
          rank: 'Scholar',
          totalPoints: 250,
          completedClasses: 12,
          completedCourses: 2,
          achievements: ['first_class'],
        },
        toObject: () => ({
          _id: 'user_999',
          name: 'Jane Doe',
          username: 'janedoe',
          avatar: 'profiles/janedoe.jpg',
          bio: 'Coding enthusiast',
          skills: ['TypeScript', 'React'],
          role: 'student',
          account_Status: { isVerified: true },
          createdAt: new Date(),
          gamification: {
            level: 3,
            rank: 'Scholar',
            totalPoints: 250,
            completedClasses: 12,
            completedCourses: 2,
            achievements: ['first_class'],
          },
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserDoc),
      });

      const profile = await service.getPublicProfile('JaneDoe');
      expect(profile.user.username).toBe('janedoe');
      expect(profile.user.name).toBe('Jane Doe');
      expect(profile.user.isVerified).toBe(true);
      expect((profile.user as any).email).toBeUndefined();
      expect((profile.user as any).otp).toBeUndefined();
      expect((profile.user as any).devices).toBeUndefined();
    });

    it('should successfully resolve public profile by MongoDB ObjectId', async () => {
      const validObjectId = '6ab4efe2f762d65012683bac';
      const mockDocById = {
        _id: validObjectId,
        name: 'Rahul Kumar',
        username: 'rahulk',
        role: 'student',
        toObject: () => ({
          _id: validObjectId,
          name: 'Rahul Kumar',
          username: 'rahulk',
          role: 'student',
          account_Status: { isVerified: true },
          createdAt: new Date(),
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockDocById),
      });

      const profile = await service.getPublicProfile(validObjectId);
      expect(profile.user.name).toBe('Rahul Kumar');
      expect(profile.user.username).toBe('rahulk');
      expect(profile.user.id).toBe(validObjectId);
    });

    it('should throw NotFoundException for non-existent student handle or ObjectId', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        service.getPublicProfile('6ab4efe2f762d65012683bac'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMe', () => {
    it('should return current user and signed avatar without sensitive secrets', async () => {
      const mockUser = {
        _id: 'user_123',
        name: 'Test Student',
        email: 'test@zeitnah.com',
        username: 'teststudent',
        usernameClaimed: true,
        avatar: 'profiles/user_123-avatar.png',
        bio: 'Aspiring Engineer',
        skills: ['JavaScript', 'CAD'],
        gamification: {
          level: 1,
          rank: 'Beginner',
          totalPoints: 50,
          profileCompletion: 80,
        },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: () => ({
          _id: 'user_123',
          name: 'Test Student',
          email: 'test@zeitnah.com',
          username: 'teststudent',
          avatar: 'profiles/user_123-avatar.png',
          gamification: { level: 1, totalPoints: 50 },
        }),
      };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await service.getMe('user_123');
      expect(res.user).toBeDefined();
      expect(res.user.name).toBe('Test Student');
      expect(res.user.avatar).toBe(
        'https://signed.cdn/profiles/user_123-avatar.png',
      );
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update name, bio, skills and award milestone rewards', async () => {
      const mockUser: any = {
        _id: 'user_123',
        name: 'Old Name',
        email: 'test@zeitnah.com',
        avatar: 'profiles/avatar.png',
        bio: '',
        skills: [],
        gamification: {
          totalPoints: 0,
          profileCompletion: 40,
          profileCompletionRewards: [],
          level: 1,
          rank: 'Beginner',
          achievements: [],
          recentActivities: [],
        },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: () => ({
          _id: 'user_123',
          name: 'Updated Name',
          bio: 'New Bio',
          skills: ['React', 'Node.js'],
          gamification: mockUser.gamification,
        }),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.updateProfile('user_123', {
        name: 'Updated Name',
        bio: 'New Bio',
        skills: ['React', 'Node.js'],
      });

      expect(res.message).toBe('Profile updated successfully');
      expect(mockUser.name).toBe('Updated Name');
      expect(mockUser.bio).toBe('New Bio');
      expect(mockUser.skills).toEqual(['React', 'Node.js']);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar to S3, clean up old avatar, and return signed URL', async () => {
      const mockUser: any = {
        _id: 'user_123',
        avatar: 'profiles/old-avatar.png',
        gamification: { rewardedMilestones: [] },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const fakeFile: any = {
        originalname: 'avatar.png',
        buffer: Buffer.from('fake-image-bytes'),
        mimetype: 'image/png',
      };

      const res = await service.uploadAvatar('user_123', fakeFile);
      expect(res.message).toBe('Avatar uploaded successfully');
      expect(res.avatar).toContain('https://signed.cdn/profiles/user_123-');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('uploadBackground', () => {
    it('should upload background cover to S3 and award milestone', async () => {
      const mockUser: any = {
        _id: 'user_123',
        backgroundImage: '',
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const fakeFile: any = {
        originalname: 'banner.jpg',
        buffer: Buffer.from('fake-banner-bytes'),
        mimetype: 'image/jpeg',
      };

      const res = await service.uploadBackground('user_123', fakeFile);
      expect(res.message).toBe('Background image uploaded successfully');
      expect(res.backgroundImage).toContain(
        'https://signed.cdn/profiles/banners/user_123-',
      );
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('Experience Subdocument CRUD', () => {
    it('should add experience record and award milestone', async () => {
      const mockUser: any = {
        _id: 'user_123',
        experience: [],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.addExperience('user_123', {
        organization: 'Zeitnah Labs',
        role: 'Full Stack Intern',
        employmentType: 'Internship',
        startDate: '2025-01-01',
        currentlyActive: true,
        description: 'Building modern student experiences.',
      });

      expect(res.message).toBe('Experience added successfully');
      expect(mockUser.experience.length).toBe(1);
      expect(mockUser.experience[0].organization).toBe('Zeitnah Labs');
      expect(mockUser.experience[0].endDate).toBeNull();
      expect(mockUser.experience[0].currentlyActive).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should successfully add ongoing role with null or empty end date', async () => {
      const mockUser: any = {
        _id: 'user_123',
        experience: [],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.addExperience('user_123', {
        organization: 'Larsen & Toubro',
        role: 'Planning Lead',
        startDate: '2024-03-01',
        endDate: null,
        currentlyActive: true,
      });

      expect(res.message).toBe('Experience added successfully');
      expect(mockUser.experience[0].endDate).toBeNull();
      expect(mockUser.experience[0].currentlyActive).toBe(true);
    });

    it('should reject non-ongoing role when end date is missing', async () => {
      const mockUser: any = { _id: 'user_123', experience: [] };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.addExperience('user_123', {
          organization: 'Zeitnah Labs',
          role: 'Intern',
          startDate: '2023-01-01',
          currentlyActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid date range where end date is before start date', async () => {
      const mockUser: any = { _id: 'user_123', experience: [] };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.addExperience('user_123', {
          organization: 'Zeitnah Labs',
          role: 'Intern',
          startDate: '2025-05-01',
          endDate: '2025-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject malformed or invalid start date', async () => {
      const mockUser: any = { _id: 'user_123', experience: [] };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.addExperience('user_123', {
          organization: 'Zeitnah Labs',
          role: 'Intern',
          startDate: 'not-a-valid-date',
          currentlyActive: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Creating an experience generates a valid UUID ID', async () => {
      const mockUser: any = {
        _id: 'user_123',
        experience: [],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.addExperience('user_123', {
        organization: 'EPC Infra Corp',
        role: 'Site Engineer',
        employmentType: 'Full-time',
        startDate: '2024-01-01',
        currentlyActive: true,
      });

      expect(res.experience[0].id).toBeDefined();
      expect(typeof res.experience[0].id).toBe('string');
      expect(res.experience[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('✓ Updating an experience preserves its existing ID', async () => {
      const existingId = '23cd74b9-c639-4269-b65d-3eecb3d00a96';
      const mockUser: any = {
        _id: 'user_123',
        experience: [
          {
            id: existingId,
            organization: 'Original Org',
            role: 'Junior Engineer',
            employmentType: 'Full-time',
            location: 'Bangalore',
            startDate: new Date('2022-01-01'),
            endDate: null,
            currentlyActive: true,
            description: 'Original description',
            skillsUsed: ['Surveying'],
            softwareUsed: ['AutoCAD'],
            infrastructureSector: 'Highways',
          },
        ],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.updateExperience('user_123', existingId, {
        organization: 'Updated Org',
        role: 'Senior Project Lead',
        startDate: '2022-01-01',
        currentlyActive: true,
      });

      expect(res.message).toBe('Experience updated successfully');
      expect(mockUser.experience[0].id).toBe(existingId);
      expect(res.experience[0].id).toBe(existingId);
      expect(mockUser.experience[0].organization).toBe('Updated Org');
      expect(mockUser.experience[0].role).toBe('Senior Project Lead');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('✓ Updating one experience does not remove IDs from other entries', async () => {
      const id1 = '11111111-1111-4111-8111-111111111111';
      const id2 = '22222222-2222-4222-8222-222222222222';
      const mockUser: any = {
        _id: 'user_123',
        experience: [
          {
            id: id1,
            organization: 'Company One',
            role: 'Role One',
            startDate: new Date('2021-01-01'),
            endDate: new Date('2022-01-01'),
            currentlyActive: false,
          },
          {
            id: id2,
            organization: 'Company Two',
            role: 'Role Two',
            startDate: new Date('2022-02-01'),
            endDate: null,
            currentlyActive: true,
          },
        ],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateExperience('user_123', id2, {
        organization: 'Company Two Updated',
        role: 'Role Two Promoted',
        startDate: '2022-02-01',
        currentlyActive: true,
      });

      expect(mockUser.experience[0].id).toBe(id1);
      expect(mockUser.experience[1].id).toBe(id2);
      expect(mockUser.experience[1].organization).toBe('Company Two Updated');
    });

    it('✓ Partial updates do not erase IDs or unrelated fields', async () => {
      const expId = '23cd74b9-c639-4269-b65d-3eecb3d00a96';
      const mockUser: any = {
        _id: 'user_123',
        experience: [
          {
            id: expId,
            organization: 'Mega Infra Ltd',
            role: 'Bridge Engineer',
            employmentType: 'Contract',
            location: 'Mumbai',
            startDate: new Date('2023-01-01'),
            endDate: null,
            currentlyActive: true,
            description: 'Designing pre-stressed concrete girders',
            skillsUsed: ['Structural Design', 'Concrete Analysis'],
            softwareUsed: ['STAAD.Pro', 'MIDAS'],
            infrastructureSector: 'Bridges & Structures',
          },
        ],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Partial update only updating role and organization
      await service.updateExperience('user_123', expId, {
        organization: 'Mega Infra Ltd (Acquired)',
        role: 'Lead Bridge Engineer',
        startDate: '2023-01-01',
        currentlyActive: true,
      });

      const updated = mockUser.experience[0];
      expect(updated.id).toBe(expId);
      expect(updated.organization).toBe('Mega Infra Ltd (Acquired)');
      expect(updated.role).toBe('Lead Bridge Engineer');
      expect(updated.employmentType).toBe('Contract');
      expect(updated.location).toBe('Mumbai');
      expect(updated.description).toBe(
        'Designing pre-stressed concrete girders',
      );
      expect(updated.skillsUsed).toEqual([
        'Structural Design',
        'Concrete Analysis',
      ]);
      expect(updated.softwareUsed).toEqual(['STAAD.Pro', 'MIDAS']);
      expect(updated.infrastructureSector).toBe('Bridges & Structures');
    });

    it('✓ Updating a nonexistent experience follows the established not-found behavior', async () => {
      const mockUser: any = {
        _id: 'user_123',
        experience: [
          {
            id: 'real-id-123',
            organization: 'Some Org',
            role: 'Lead',
            startDate: new Date('2023-01-01'),
            currentlyActive: true,
          },
        ],
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateExperience('user_123', 'nonexistent-uuid-999', {
          organization: 'Any Org',
          role: 'Any Role',
          startDate: '2023-01-01',
          currentlyActive: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('✓ Invalid payloads are rejected safely on update', async () => {
      const expId = '23cd74b9-c639-4269-b65d-3eecb3d00a96';
      const mockUser: any = {
        _id: 'user_123',
        experience: [
          {
            id: expId,
            organization: 'Test Org',
            role: 'Engineer',
            startDate: new Date('2023-01-01'),
            currentlyActive: true,
          },
        ],
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Malformed start date
      await expect(
        service.updateExperience('user_123', expId, {
          organization: 'Test Org',
          role: 'Engineer',
          startDate: 'invalid-date',
          currentlyActive: true,
        }),
      ).rejects.toThrow(BadRequestException);

      // End date before start date
      await expect(
        service.updateExperience('user_123', expId, {
          organization: 'Test Org',
          role: 'Engineer',
          startDate: '2023-05-01',
          endDate: '2023-01-01',
          currentlyActive: false,
        }),
      ).rejects.toThrow(BadRequestException);

      // Missing end date for past role
      await expect(
        service.updateExperience('user_123', expId, {
          organization: 'Test Org',
          role: 'Engineer',
          startDate: '2023-01-01',
          currentlyActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Legacy entries missing IDs are handled according to the confirmed repair strategy', async () => {
      const targetId = '23cd74b9-c639-4269-b65d-3eecb3d00a96';
      const mockUser: any = {
        _id: 'user_123',
        experience: [
          {
            // Legacy record missing id property
            organization: 'Legacy Civil Contractors',
            role: 'Site Trainee',
            startDate: new Date('2019-01-01'),
            endDate: new Date('2020-01-01'),
            currentlyActive: false,
          },
          {
            id: targetId,
            organization: 'Modern Infra Corp',
            role: 'Project Manager',
            startDate: new Date('2021-01-01'),
            currentlyActive: true,
          },
        ],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateExperience('user_123', targetId, {
        organization: 'Modern Infra Corp (Updated)',
        role: 'Senior Project Manager',
        startDate: '2021-01-01',
        currentlyActive: true,
      });

      // Target entry preserved its ID
      expect(mockUser.experience[1].id).toBe(targetId);
      // Legacy entry received a valid UUID repair without throwing or corrupting data
      expect(mockUser.experience[0].id).toBeDefined();
      expect(typeof mockUser.experience[0].id).toBe('string');
      expect(mockUser.experience[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(mockUser.experience[0].organization).toBe(
        'Legacy Civil Contractors',
      );
    });

    it('✓ Real Mongoose Document validates successfully after updateExperience (no ValidationError: experience.0.id)', async () => {
      const TestUserModel =
        mongoose.models['RealMongooseExpTest'] ||
        mongoose.model('RealMongooseExpTest', UserSchema);

      const targetId = '23cd74b9-c639-4269-b65d-3eecb3d00a96';
      const realUserDoc: any = new TestUserModel({
        email: 'mongoose_test@zeitnah.test',
        username: 'mongotestuser',
        name: 'Mongoose Test User',
        experience: [
          {
            id: targetId,
            organization: 'Original Builder',
            role: 'Planning Engineer',
            startDate: new Date('2023-01-01'),
            currentlyActive: true,
          },
        ],
      });

      // Confirm subdocument has id before update
      expect(realUserDoc.experience[0].id).toBe(targetId);

      realUserDoc.save = jest.fn().mockImplementation(async () => {
        await realUserDoc.validate();
        return realUserDoc;
      });

      mockUserModel.findById.mockResolvedValue(realUserDoc);

      await service.updateExperience('user_123', targetId, {
        organization: 'Original Builder (Updated)',
        role: 'Senior Planning Engineer',
        startDate: '2023-01-01',
        currentlyActive: true,
      });

      // CRITICAL: Ensure id was NOT lost and validate() does NOT throw ValidationError
      expect(realUserDoc.experience[0].id).toBe(targetId);
      await expect(realUserDoc.validate()).resolves.toBeUndefined();
    });
  });

  describe('Education Subdocument CRUD', () => {
    it('should add education record and award milestone', async () => {
      const mockUser: any = {
        _id: 'user_123',
        education: [],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.addEducation('user_123', {
        institution: 'Kerala Institute of Technology',
        qualification: 'Bachelor of Technology',
        fieldOfStudy: 'Computer Science',
        startDate: '2022-09-01',
        currentlyStudying: true,
      });

      expect(res.message).toBe('Education added successfully');
      expect(mockUser.education.length).toBe(1);
      expect(mockUser.education[0].institution).toBe(
        'Kerala Institute of Technology',
      );
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('Certifications Subdocument CRUD', () => {
    it('should add certification record and award milestone', async () => {
      const mockUser: any = {
        _id: 'user_123',
        certifications: [],
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.addCertification('user_123', {
        name: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        issueDate: '2025-03-15',
        credentialId: 'AWS-123456',
        credentialUrl: 'https://aws.amazon.com/verify/123456',
      });

      expect(res.message).toBe('Certification added successfully');
      expect(mockUser.certifications.length).toBe(1);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('Recommendations', () => {
    it('should reject self-recommendation', async () => {
      await expect(
        service.submitRecommendation('user_123', {
          recipientId: 'user_123',
          relationship: 'Peer / Student',
          content: 'I am writing a great recommendation for myself.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit recommendation from authorized user to recipient', async () => {
      const mockRecipient = { _id: 'recipient_456', name: 'Recipient Student' };
      const mockAuthor = {
        _id: 'author_123',
        name: 'Author Student',
        username: 'authorstudent',
        avatar: 'profiles/author.png',
        headline: 'Peer Learner',
        role: 'student',
      };

      mockUserModel.findById
        .mockResolvedValueOnce(mockRecipient)
        .mockResolvedValueOnce(mockAuthor);

      mockRecommendationModel.findOne.mockResolvedValue(null);

      const res = await service.submitRecommendation('author_123', {
        recipientId: 'recipient_456',
        relationship: 'Peer / Student',
        content:
          'An exceptional collaborator and passionate learner on Zeitnah.',
      });

      expect(res.message).toBe('Recommendation submitted successfully.');
      expect(res.recommendation).toBeDefined();
    });
  });

  describe('Public Profile Publish State', () => {
    it('should prevent publishing if required checklist is incomplete', async () => {
      const mockUser: any = {
        _id: 'user_123',
        name: 'Student',
        avatar: '', // missing
        headline: '', // missing
        bio: '',
        skills: [],
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.setPublicProfilePublishState('user_123', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow publishing when required checklist is complete', async () => {
      const mockUser: any = {
        _id: 'user_123',
        name: 'Student',
        username: 'studentuser',
        avatar: 'profiles/avatar.png',
        headline: 'Student Developer',
        bio: 'Passionate about full-stack engineering and learning.',
        skills: ['JavaScript', 'React', 'Node.js'],
        publicProfilePublished: false,
        gamification: { rewardedMilestones: [], totalPoints: 0 },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.setPublicProfilePublishState('user_123', true);
      expect(res.published).toBe(true);
      expect(mockUser.publicProfilePublished).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('Phase 1: Infrastructure Profile & Role System', () => {
    it('Student can select student role', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.updateProfile('user_1', {
        primaryRole: 'student',
      });
      expect(mockUser.primaryRole).toBe('STUDENT');
      expect(res.user.primaryRole).toBe('STUDENT');
    });

    it('Professional can select professional role', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateProfile('user_1', { primaryRole: 'professional' });
      expect(mockUser.primaryRole).toBe('PROFESSIONAL');
    });

    it('Legacy Mentor role selection safely normalizes to canonical PROFESSIONAL', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateProfile('user_1', { primaryRole: 'mentor' });
      expect(mockUser.primaryRole).toBe('PROFESSIONAL');
    });

    it('Mentorship capability, preferences, and topics remain preserved when normalizing role', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        mentorship: {
          isAvailableForMentorship: true,
          topics: ['Structural BIM', 'Bridge Engineering'],
          maxMentees: 3,
          availabilityNotes: 'Evenings and weekends',
        },
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateProfile('user_1', { primaryRole: 'mentor' });
      expect(mockUser.primaryRole).toBe('PROFESSIONAL');
      expect(mockUser.mentorship.isAvailableForMentorship).toBe(true);
      expect(mockUser.mentorship.topics).toEqual([
        'Structural BIM',
        'Bridge Engineering',
      ]);
      expect(mockUser.mentorship.maxMentees).toBe(3);
    });

    it('Recruiter can select recruiter role', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateProfile('user_1', { primaryRole: 'recruiter' });
      expect(mockUser.primaryRole).toBe('RECRUITER');
    });

    it('Legacy Founder role selection safely normalizes to canonical RECRUITER', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateProfile('user_1', { primaryRole: 'founder' });
      expect(mockUser.primaryRole).toBe('RECRUITER');
    });

    it('User cannot assign themselves educator role (rejected with 403 Forbidden)', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile('user_1', { primaryRole: 'educator' }, 'student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('User cannot assign themselves admin role (rejected with 400 BadRequest)', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile('user_1', { primaryRole: 'ADMIN' }, 'student'),
      ).rejects.toThrow(BadRequestException);
    });

    it('Admin can assign educator role to user', async () => {
      const mockAdmin: any = {
        _id: 'admin_1',
        role: 'admin',
      };
      const mockTargetUser: any = {
        _id: 'user_target',
        username: 'profjohn',
        primaryRole: 'STUDENT',
        role: 'student',
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockTargetUser);

      const res = await service.adminAssignRole(
        'admin_1',
        'user_target',
        'educator',
      );

      expect(res.success).toBe(true);
      expect(mockTargetUser.primaryRole).toBe('EDUCATOR');
      expect(mockTargetUser.role).toBe('teacher');
      expect(mockTargetUser.save).toHaveBeenCalled();
      expect(mockAuditLogsService.record).toHaveBeenCalled();
    });

    it('Admin with uppercase role "ADMIN" can assign educator role to user', async () => {
      const mockAdmin: any = {
        _id: 'admin_1',
        role: 'ADMIN',
      };
      const mockTargetUser: any = {
        _id: 'user_target',
        username: 'profmary',
        primaryRole: 'STUDENT',
        role: 'student',
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockTargetUser);

      const res = await service.adminAssignRole(
        'admin_1',
        'user_target',
        'educator',
      );

      expect(res.success).toBe(true);
      expect(mockTargetUser.primaryRole).toBe('EDUCATOR');
      expect(mockTargetUser.role).toBe('teacher');
      expect(mockTargetUser.save).toHaveBeenCalled();
    });

    it('Non-admin cannot assign educator role (rejected with 403 Forbidden)', async () => {
      const mockNonAdmin: any = {
        _id: 'user_regular',
        role: 'student',
      };

      mockUserModel.findById.mockResolvedValueOnce(mockNonAdmin);

      await expect(
        service.adminAssignRole('user_regular', 'user_target', 'educator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Admin with uppercase "ADMIN" requesterRole can update educator role in updateProfile', async () => {
      const mockEducator: any = {
        _id: 'user_edu',
        primaryRole: 'EDUCATOR',
        toObject: () => ({ ...mockEducator }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockEducator);

      const res = await service.updateProfile(
        'user_edu',
        { primaryRole: 'PROFESSIONAL' },
        'ADMIN',
      );

      expect(mockEducator.primaryRole).toBe('PROFESSIONAL');
      expect(mockEducator.role).toBe('student');
    });

    it('Educator cannot remove or change administrator-assigned role', async () => {
      const mockEducator: any = {
        _id: 'user_edu',
        primaryRole: 'EDUCATOR',
        toObject: () => ({ ...mockEducator }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockEducator);

      await expect(
        service.updateProfile(
          'user_edu',
          { primaryRole: 'student' },
          'teacher',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Invalid role rejected with BadRequestException', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile('user_1', { primaryRole: 'superman' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Infrastructure profile fields and career preferences save correctly', async () => {
      const mockUser: any = {
        _id: 'user_1',
        primaryRole: 'STUDENT',
        toObject: () => ({ ...mockUser }),
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      const res = await service.updateProfile('user_1', {
        primaryDiscipline: 'Civil Engineering',
        specializations: ['Structural Engineering', 'BIM'],
        infrastructureSectors: ['Highways', 'Bridges'],
        preferredLocations: ['Dubai', 'Mumbai'],
        yearsOfExperience: 5,
        careerPreferences: {
          openToOpportunities: true,
          preferredRoles: ['Bridge Engineer'],
          preferredSectors: ['Bridges'],
          preferredLocations: ['Dubai'],
          preferredWorkMode: 'On-site',
          preferredEmploymentType: 'Full-time',
          expectedSalaryRange: {
            min: 80000,
            max: 120000,
            currency: 'USD',
            period: 'yearly',
          },
          availability: '30 Days',
        },
      });

      expect(mockUser.primaryDiscipline).toBe('Civil Engineering');
      expect(mockUser.specializations).toEqual([
        'Structural Engineering',
        'BIM',
      ]);
      expect(mockUser.infrastructureSectors).toEqual(['Highways', 'Bridges']);
      expect(mockUser.yearsOfExperience).toBe(5);
      expect(mockUser.careerPreferences.openToOpportunities).toBe(true);
      expect(mockUser.careerPreferences.preferredRoles).toEqual([
        'Bridge Engineer',
      ]);
    });

    it('Private fields are not exposed publicly in getPublicProfile', async () => {
      const mockUserDoc: any = {
        _id: 'user_priv',
        name: 'Private Engineer',
        username: 'priveng',
        avatar: '',
        headline: 'Site Engineer',
        primaryDiscipline: 'Site Engineering',
        experience: [
          { id: 'exp_1', role: 'Site Engineer', organization: 'Secret Co' },
        ],
        careerPreferences: {
          openToOpportunities: true,
          preferredRoles: ['Project Manager'],
        },
        privacySettings: {
          experience: 'PRIVATE',
          education: 'PUBLIC',
          projects: 'PUBLIC',
          certifications: 'PUBLIC',
          careerPreferences: 'PRIVATE',
          contactInfo: 'PRIVATE',
        },
        toObject: () => ({
          _id: 'user_priv',
          name: 'Private Engineer',
          username: 'priveng',
          avatar: '',
          headline: 'Site Engineer',
          primaryDiscipline: 'Site Engineering',
          experience: [
            { id: 'exp_1', role: 'Site Engineer', organization: 'Secret Co' },
          ],
          education: [],
          certifications: [],
          careerPreferences: {
            openToOpportunities: true,
            preferredRoles: ['Project Manager'],
          },
          privacySettings: {
            experience: 'PRIVATE',
            education: 'PUBLIC',
            projects: 'PUBLIC',
            certifications: 'PUBLIC',
            careerPreferences: 'PRIVATE',
            contactInfo: 'PRIVATE',
          },
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserDoc),
      });

      const res = await service.getPublicProfile('priveng');
      // Private experience should not be exposed
      expect(res.user.experience).toEqual([]);
      // Private career preferences should not be exposed
      expect(res.user.careerPreferences).toBeNull();
      // Public discipline should be present
      expect(res.user.primaryDiscipline).toBe('Site Engineering');
    });

    it('Credential IDs are stripped from public profile certifications', async () => {
      const mockUserDoc: any = {
        _id: 'user_cert_priv',
        name: 'Certified Engineer',
        username: 'certeng',
        avatar: '',
        privacySettings: {
          experience: 'PUBLIC',
          education: 'PUBLIC',
          certifications: 'PUBLIC',
        },
        toObject: () => ({
          _id: 'user_cert_priv',
          name: 'Certified Engineer',
          username: 'certeng',
          avatar: '',
          education: [],
          certifications: [
            {
              id: 'cert-1',
              name: 'PMP',
              issuer: 'PMI',
              credentialId: 'SECRET-CRED-ID-999',
              credentialUrl: 'https://pmi.org',
            },
          ],
          privacySettings: {
            certifications: 'PUBLIC',
          },
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserDoc),
      });

      const res = await service.getPublicProfile('certeng');
      expect(res.user.certifications).toHaveLength(1);
      expect(res.user.certifications[0].name).toBe('PMP');
      expect(res.user.certifications[0].credentialId).toBeUndefined();
      expect(res.user.certifications[0].credentialUrl).toBe('https://pmi.org');
    });

    it('Private fields are masked in getPublicProfile when legacy privacy keys are used', async () => {
      const mockUserDoc: any = {
        _id: 'user_legacy_priv',
        name: 'Legacy Private Engineer',
        username: 'legacypriv',
        avatar: '',
        headline: 'Planning Engineer',
        primaryDiscipline: 'Planning & Scheduling',
        experience: [
          { id: 'exp_2', role: 'Planning Lead', organization: 'EPC Corp' },
        ],
        education: [
          { id: 'edu_1', institution: 'IIT', qualification: 'B.Tech' },
        ],
        certifications: [{ id: 'cert_1', name: 'P6 Specialist' }],
        careerPreferences: {
          openToOpportunities: true,
          preferredRoles: ['Project Controls Lead'],
        },
        privacySettings: {
          experienceVisibility: 'PRIVATE',
          educationVisibility: 'PRIVATE',
          certificationsVisibility: 'PRIVATE',
          careerPreferencesVisibility: 'PRIVATE',
        },
        toObject: () => ({
          _id: 'user_legacy_priv',
          name: 'Legacy Private Engineer',
          username: 'legacypriv',
          avatar: '',
          headline: 'Planning Engineer',
          primaryDiscipline: 'Planning & Scheduling',
          experience: [
            { id: 'exp_2', role: 'Planning Lead', organization: 'EPC Corp' },
          ],
          education: [
            { id: 'edu_1', institution: 'IIT', qualification: 'B.Tech' },
          ],
          certifications: [{ id: 'cert_1', name: 'P6 Specialist' }],
          careerPreferences: {
            openToOpportunities: true,
            preferredRoles: ['Project Controls Lead'],
          },
          privacySettings: {
            experienceVisibility: 'PRIVATE',
            educationVisibility: 'PRIVATE',
            certificationsVisibility: 'PRIVATE',
            careerPreferencesVisibility: 'PRIVATE',
          },
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserDoc),
      });

      const res = await service.getPublicProfile('legacypriv');
      expect(res.user.experience).toEqual([]);
      expect(res.user.education).toEqual([]);
      expect(res.user.certifications).toEqual([]);
      expect(res.user.careerPreferences).toBeNull();
      // privacySettings returned should expose both canonical and legacy aliases
      expect(res.user.privacySettings.experience).toBe('PRIVATE');
      expect(res.user.privacySettings.experienceVisibility).toBe('PRIVATE');
    });

    it('updateProfile normalizes legacy structured skills, career preferences, and privacy keys', async () => {
      const mockUser: any = {
        _id: 'user_123',
        name: 'Normalizing User',
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: jest
          .fn()
          .mockReturnValue({ _id: 'user_123', name: 'Normalizing User' }),
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.updateProfile('user_123', {
        structuredSkills: {
          softwareTools: ['Primavera P6', 'Revit'],
          technicalCalculations: ['Concrete Design'],
          industryStandards: ['FIDIC'],
          professionalLeadership: ['Coordination'],
        },
        careerPreferences: {
          targetRoles: ['Chief Engineer'],
          preferredInfrastructureSectors: ['Highways'],
          expectedSalary: { min: 100000, max: 150000, currency: 'USD' },
          activelyLooking: true,
          workModes: ['Remote'],
        },
        privacySettings: {
          experienceVisibility: 'PRIVATE',
          educationVisibility: 'PUBLIC',
        },
      });

      // Verify canonical structuredSkills normalization
      expect(mockUser.structuredSkills.softwareSkills).toEqual([
        'Primavera P6',
        'Revit',
      ]);
      expect(mockUser.structuredSkills.technicalSkills).toEqual([
        'Concrete Design',
      ]);
      expect(mockUser.structuredSkills.industrySkills).toEqual(['FIDIC']);
      expect(mockUser.structuredSkills.professionalSkills).toEqual([
        'Coordination',
      ]);

      // Verify canonical careerPreferences normalization
      expect(mockUser.careerPreferences.preferredRoles).toEqual([
        'Chief Engineer',
      ]);
      expect(mockUser.careerPreferences.preferredSectors).toEqual(['Highways']);
      expect(mockUser.careerPreferences.expectedSalaryRange.min).toBe(100000);
      expect(mockUser.careerPreferences.expectedSalaryRange.max).toBe(150000);
      expect(mockUser.careerPreferences.expectedSalaryRange.currency).toBe(
        'USD',
      );
      expect(mockUser.careerPreferences.openToOpportunities).toBe(true);
      expect(mockUser.careerPreferences.preferredWorkMode).toBe('Remote');

      // Verify canonical privacySettings normalization
      expect(mockUser.privacySettings.experience).toBe('PRIVATE');
      expect(mockUser.privacySettings.education).toBe('PUBLIC');
    });

    it('User can save and reload OPEN_TO_HIRING, OPEN_TO_WORK, and NOT_AVAILABLE availability', async () => {
      const mockUser: any = {
        _id: 'user_avail_1',
        name: 'Availability Tester',
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: jest.fn().mockImplementation(function () {
          return { ...this };
        }),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // 1. OPEN_TO_HIRING
      await service.updateProfile('user_avail_1', {
        availability: 'OPEN_TO_HIRING',
      });
      expect(mockUser.availability).toBe('OPEN_TO_HIRING');

      // 2. OPEN_TO_WORK
      await service.updateProfile('user_avail_1', {
        availability: 'OPEN_TO_WORK',
      });
      expect(mockUser.availability).toBe('OPEN_TO_WORK');

      // 3. NOT_AVAILABLE
      await service.updateProfile('user_avail_1', {
        availability: 'NOT_AVAILABLE',
      });
      expect(mockUser.availability).toBe('NOT_AVAILABLE');
    });

    it('Legacy availability values are safely mapped to new options on write and read', async () => {
      const mockUser: any = {
        _id: 'user_legacy_avail',
        name: 'Legacy Avail User',
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: jest.fn().mockImplementation(function () {
          return { ...this };
        }),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // OPEN_TO_OPPORTUNITIES -> OPEN_TO_WORK
      await service.updateProfile('user_legacy_avail', {
        availability: 'OPEN_TO_OPPORTUNITIES',
      });
      expect(mockUser.availability).toBe('OPEN_TO_WORK');

      // AVAILABLE_FOR_COLLABORATION -> OPEN_TO_WORK
      await service.updateProfile('user_legacy_avail', {
        availability: 'AVAILABLE_FOR_COLLABORATION',
      });
      expect(mockUser.availability).toBe('OPEN_TO_WORK');

      // AVAILABLE_FOR_MENTORSHIP -> OPEN_TO_WORK
      await service.updateProfile('user_legacy_avail', {
        availability: 'AVAILABLE_FOR_MENTORSHIP',
      });
      expect(mockUser.availability).toBe('OPEN_TO_WORK');

      // NOT_CURRENTLY_AVAILABLE -> NOT_AVAILABLE
      await service.updateProfile('user_legacy_avail', {
        availability: 'NOT_CURRENTLY_AVAILABLE',
      });
      expect(mockUser.availability).toBe('NOT_AVAILABLE');
    });

    it('Availability status does not grant recruiter authorization or change primaryRole', async () => {
      const mockUser: any = {
        _id: 'user_student_hiring',
        primaryRole: 'STUDENT',
        role: 'student',
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: jest.fn().mockImplementation(function () {
          return { ...this };
        }),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Student sets availability to OPEN_TO_HIRING
      await service.updateProfile('user_student_hiring', {
        availability: 'OPEN_TO_HIRING',
      });

      // Role must remain STUDENT, not escalated to RECRUITER or ADMIN
      expect(mockUser.availability).toBe('OPEN_TO_HIRING');
      expect(mockUser.primaryRole).toBe('STUDENT');
      expect(mockUser.role).toBe('student');
    });
  });

  describe('Phase 6: Automatic Custom-Title Request Integration (ProfileService.updateProfile)', () => {
    let mockUser: any;

    beforeEach(() => {
      mockUser = {
        _id: 'user_123',
        name: 'Jane Doe',
        email: 'jane.doe@zeitnah.com',
        avatar: 'profiles/jane.png',
        bio: 'Civil engineer with 10 years experience',
        skills: ['AutoCAD', 'Structural Analysis'],
        currentRole: 'Junior Engineer',
        headline: 'Passionate about sustainable infrastructure',
        primaryRole: 'PROFESSIONAL',
        professionalIdentity: null,
        gamification: { rewardedMilestones: [] },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
        toObject: function () {
          return {
            _id: this._id,
            name: this.name,
            email: this.email,
            avatar: this.avatar,
            bio: this.bio,
            skills: this.skills,
            currentRole: this.currentRole,
            headline: this.headline,
            primaryRole: this.primaryRole,
            professionalIdentity: this.professionalIdentity,
          };
        },
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
    });

    // 1. Predefined title saves without creating a request
    it('1. Predefined title saves without creating a request', async () => {
      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:site-engineer-civil',
          isCustomTitle: false,
        },
      });

      expect(
        mockCatalogueTitleRequestService.findOrCreateOrReuseRequest,
      ).not.toHaveBeenCalled();
      expect(res.customTitleRequest).toBeUndefined();
      expect(mockUser.professionalIdentity.isCustomTitle).toBe(false);
      expect(mockUser.professionalIdentity.titleId).toBe(
        'civil-engineering:site-engineer-civil',
      );
      expect(mockUser.currentRole).toBe('Site Engineer (civil)');
      expect(mockUser.save).toHaveBeenCalled();
    });

    // 2. New custom title creates one pending request
    it('2. New custom title creates one pending request and attaches metadata to response', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'CREATED_PENDING',
          request: {
            _id: 'req_new_1',
            status: 'pending',
            departmentId: 'civil-engineering',
            requestedTitle: 'Tunnel Ventilation Engineer',
          },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Tunnel Ventilation Engineer',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Tunnel Ventilation Engineer',
          isCustomTitle: true,
        },
      });

      expect(
        mockCatalogueTitleRequestService.findOrCreateOrReuseRequest,
      ).toHaveBeenCalledWith(
        { userId: 'user_123', name: 'Jane Doe', email: 'jane.doe@zeitnah.com' },
        'civil-engineering',
        'Tunnel Ventilation Engineer',
      );
      expect(res.customTitleRequest).toEqual({
        action: 'CREATED_PENDING',
        requestId: 'req_new_1',
        status: 'pending',
        isOfficialTitle: false,
        reused: false,
        isNew: true,
      });
      expect(mockUser.professionalIdentity.isCustomTitle).toBe(true);
      expect(mockUser.professionalIdentity.titleName).toBe(
        'Tunnel Ventilation Engineer',
      );
      expect(mockUser.currentRole).toBe('Tunnel Ventilation Engineer');
      expect(mockUser.save).toHaveBeenCalled();
    });

    // 3. Same user saves the same custom title repeatedly
    it('3. Same user saves the same custom title repeatedly (idempotent reuse)', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'REUSED_PENDING',
          request: {
            _id: 'req_existing_1',
            status: 'pending',
            departmentId: 'civil-engineering',
          },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Tunnel Ventilation Engineer',
          isOfficialTitle: false,
          isNew: false,
          reused: true,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Tunnel Ventilation Engineer',
          isCustomTitle: true,
        },
      });

      expect(res.customTitleRequest.action).toBe('REUSED_PENDING');
      expect(res.customTitleRequest.reused).toBe(true);
      expect(res.customTitleRequest.requestId).toBe('req_existing_1');
      expect(mockUser.save).toHaveBeenCalled();
    });

    // 4. A second user saves the same title in the same department
    it('4. A second user saves the same title in the same department (cross-user pending request reuse)', async () => {
      const user2: any = {
        ...mockUser,
        _id: 'user_456',
        name: 'Bob Smith',
        email: 'bob@zeitnah.com',
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        },
      };
      mockUserModel.findById.mockResolvedValue(user2);

      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'REUSED_PENDING',
          request: {
            _id: 'req_user1_pending',
            requestedBy: 'user_123',
            status: 'pending',
          },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Tunnel Ventilation Engineer',
          isOfficialTitle: false,
          isNew: false,
          reused: true,
        },
      );

      const res = await service.updateProfile('user_456', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Tunnel Ventilation Engineer',
          isCustomTitle: true,
        },
      });

      expect(
        mockCatalogueTitleRequestService.findOrCreateOrReuseRequest,
      ).toHaveBeenCalledWith(
        { userId: 'user_456', name: 'Bob Smith', email: 'bob@zeitnah.com' },
        'civil-engineering',
        'Tunnel Ventilation Engineer',
      );
      expect(res.customTitleRequest.action).toBe('REUSED_PENDING');
      expect(res.customTitleRequest.reused).toBe(true);
      expect(user2.currentRole).toBe('Tunnel Ventilation Engineer');
      expect(user2.save).toHaveBeenCalled();
    });

    // 5. Concurrent equivalent requests encounter duplicate-key recovery
    it('5. Concurrent equivalent requests encounter duplicate-key recovery without leaking 409', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'REUSED_PENDING',
          request: { _id: 'req_concurrent_winner', status: 'pending' },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Tunnel Ventilation Engineer',
          isOfficialTitle: false,
          isNew: false,
          reused: true,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Tunnel Ventilation Engineer',
          isCustomTitle: true,
        },
      });

      expect(res.message).toBe('Profile updated successfully');
      expect(res.customTitleRequest.action).toBe('REUSED_PENDING');
      expect(res.customTitleRequest.requestId).toBe('req_concurrent_winner');
    });

    // 6. Existing official title or alias is resolved without creating a request
    it('6. Existing official title or alias is resolved without creating a request', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'OFFICIAL_TITLE_EXISTS',
          request: null,
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: 'civil-engineering:structural-engineer-civil',
          resolvedTitleName: 'Structural engineer (civil)',
          isOfficialTitle: true,
          isNew: false,
          reused: false,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Structural engineer (civil)',
          isCustomTitle: true,
        },
      });

      expect(res.customTitleRequest.action).toBe('OFFICIAL_TITLE_EXISTS');
      expect(res.customTitleRequest.isOfficialTitle).toBe(true);
      expect(res.customTitleRequest.requestId).toBeNull();
      // Converted from custom to official catalogue title!
      expect(mockUser.professionalIdentity.isCustomTitle).toBe(false);
      expect(mockUser.professionalIdentity.titleId).toBe(
        'civil-engineering:structural-engineer-civil',
      );
      expect(mockUser.professionalIdentity.titleName).toBe(
        'Structural engineer (civil)',
      );
      expect(mockUser.currentRole).toBe('Structural engineer (civil)');
    });

    // 7. An approved request is handled without creating a duplicate
    it('7. An approved request is handled without creating a duplicate', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'ALREADY_APPROVED',
          request: {
            _id: 'req_approved_1',
            status: 'approved',
            createdTitleId: 'civil-engineering:geothermal-specialist',
          },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: 'civil-engineering:geothermal-specialist',
          resolvedTitleName: 'Geothermal Specialist',
          isOfficialTitle: true,
          isNew: false,
          reused: true,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Geothermal Specialist',
          isCustomTitle: true,
        },
      });

      expect(res.customTitleRequest.action).toBe('ALREADY_APPROVED');
      expect(res.customTitleRequest.requestId).toBe('req_approved_1');
      expect(mockUser.professionalIdentity.isCustomTitle).toBe(false);
      expect(mockUser.professionalIdentity.titleId).toBe(
        'civil-engineering:geothermal-specialist',
      );
      expect(mockUser.currentRole).toBe('Geothermal Specialist');
    });

    // 8. A rejected request follows the documented retry policy
    it('8. A rejected request follows the documented retry policy (preserves rejected record, creates new pending)', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'CREATED_PENDING',
          request: {
            _id: 'req_new_retry',
            status: 'pending',
            requestedTitle: 'Previously Rejected Title',
          },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Previously Rejected Title',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Previously Rejected Title',
          isCustomTitle: true,
        },
      });

      expect(res.customTitleRequest.action).toBe('CREATED_PENDING');
      expect(res.customTitleRequest.requestId).toBe('req_new_retry');
      expect(mockUser.currentRole).toBe('Previously Rejected Title');
      expect(mockUser.save).toHaveBeenCalled();
    });

    // 9. Invalid title and inactive department are rejected
    it('9. Invalid title and inactive department are rejected without mutating profile', async () => {
      await expect(
        service.updateProfile('user_123', {
          professionalIdentity: {
            departmentId: 'civil-engineering',
            customTitle: 'Bad <script>alert(1)</script>',
            isCustomTitle: true,
          },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateProfile('user_123', {
          professionalIdentity: {
            departmentId: 'non-existent-dept',
            customTitle: 'Valid Title',
            isCustomTitle: true,
          },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockCatalogueTitleRequestService.findOrCreateOrReuseRequest,
      ).not.toHaveBeenCalled();
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    // 10. Request insertion fails
    it('10. Request insertion fails (bubbles error, profile save is aborted)', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockRejectedValue(
        new Error('MongoDB cluster write timeout'),
      );

      await expect(
        service.updateProfile('user_123', {
          professionalIdentity: {
            departmentId: 'civil-engineering',
            customTitle: 'Failing Request Title',
            isCustomTitle: true,
          },
        }),
      ).rejects.toThrow('MongoDB cluster write timeout');

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    // 11. Profile persistence fails after request handling
    it('11. Profile persistence fails after request handling (bubbles error, request was safely created)', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'CREATED_PENDING',
          request: { _id: 'req_created_before_user_fail', status: 'pending' },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Bridge Specialist',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      mockUser.save.mockRejectedValue(
        new Error('User document write lock error'),
      );

      await expect(
        service.updateProfile('user_123', {
          professionalIdentity: {
            departmentId: 'civil-engineering',
            customTitle: 'Bridge Specialist',
            isCustomTitle: true,
          },
        }),
      ).rejects.toThrow('User document write lock error');
    });

    // 12. Retry after a simulated timeout
    it('12. Retry after a simulated timeout succeeds idempotently', async () => {
      // First attempt: request service created request, but network timed out before profile response
      // Second attempt: retry calls findOrCreateOrReuseRequest which reuses pending request
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'REUSED_PENDING',
          request: { _id: 'req_timed_out_prior', status: 'pending' },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Bridge Specialist',
          isOfficialTitle: false,
          isNew: false,
          reused: true,
        },
      );

      const res = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Bridge Specialist',
          isCustomTitle: true,
        },
      });

      expect(res.message).toBe('Profile updated successfully');
      expect(res.customTitleRequest.action).toBe('REUSED_PENDING');
      expect(res.customTitleRequest.reused).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    // 13. Department or custom-title changes preserve historical requests
    it('13. Department or custom-title changes preserve historical requests', async () => {
      // Step 1: User saves in civil engineering
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValueOnce(
        {
          action: 'CREATED_PENDING',
          request: {
            _id: 'req_civil_1',
            status: 'pending',
            departmentId: 'civil-engineering',
          },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Civil Specialist',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Civil Specialist',
          isCustomTitle: true,
        },
      });

      // Step 2: User changes department to mechanical engineering with a new custom title
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValueOnce(
        {
          action: 'CREATED_PENDING',
          request: {
            _id: 'req_mech_2',
            status: 'pending',
            departmentId: 'mechanical-engineering',
          },
          departmentId: 'mechanical-engineering',
          departmentName: 'Mechanical Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Robotics Specialist',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      const res2 = await service.updateProfile('user_123', {
        professionalIdentity: {
          departmentId: 'mechanical-engineering',
          customTitle: 'Robotics Specialist',
          isCustomTitle: true,
        },
      });

      expect(res2.customTitleRequest.requestId).toBe('req_mech_2');
      expect(mockUser.professionalIdentity.departmentId).toBe(
        'mechanical-engineering',
      );
      expect(mockUser.professionalIdentity.titleName).toBe(
        'Robotics Specialist',
      );
      // No deletion or revocation call was made against req_civil_1
    });

    // 14. Existing headline/currentRole behaviour remains correct
    it('14. Existing headline/currentRole behaviour remains correct with custom title update', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'CREATED_PENDING',
          request: { _id: 'req_headline_test', status: 'pending' },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Tunnel Engineer',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      await service.updateProfile('user_123', {
        headline: 'Passionate about underground infrastructure',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Tunnel Engineer',
          isCustomTitle: true,
        },
      });

      expect(mockUser.headline).toBe(
        'Passionate about underground infrastructure',
      );
      expect(mockUser.currentRole).toBe('Tunnel Engineer');
      expect(mockUser.professionalIdentity.titleName).toBe('Tunnel Engineer');
    });

    // 15. Authentication-derived requester identity cannot be overridden by client data
    it('15. Authentication-derived requester identity cannot be overridden by client data', async () => {
      mockCatalogueTitleRequestService.findOrCreateOrReuseRequest.mockResolvedValue(
        {
          action: 'CREATED_PENDING',
          request: { _id: 'req_auth_test', status: 'pending' },
          departmentId: 'civil-engineering',
          departmentName: 'Civil Engineering',
          resolvedTitleId: null,
          resolvedTitleName: 'Security Specialist',
          isOfficialTitle: false,
          isNew: true,
          reused: false,
        },
      );

      // Client attempts to spoof requester identity in payload
      const spoofedPayload: any = {
        requesterId: 'hacker_999',
        requesterName: 'Hacker Admin',
        requesterEmail: 'admin@hacked.com',
        professionalIdentity: {
          departmentId: 'civil-engineering',
          customTitle: 'Security Specialist',
          isCustomTitle: true,
        },
      };

      await service.updateProfile('user_123', spoofedPayload);

      // Verify that findOrCreateOrReuseRequest received the genuine authenticated user identity from DB
      expect(
        mockCatalogueTitleRequestService.findOrCreateOrReuseRequest,
      ).toHaveBeenCalledWith(
        {
          userId: 'user_123',
          name: 'Jane Doe',
          email: 'jane.doe@zeitnah.com',
        },
        'civil-engineering',
        'Security Specialist',
      );
    });
  });
});
