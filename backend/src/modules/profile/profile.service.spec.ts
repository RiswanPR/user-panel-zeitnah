import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { User } from '../auth/schemas/user.schema';
import { CommunityProfile } from '../community/profile/schemas/community-profile.schema';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { UsernameService } from './services/username.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockUserModel: any;
  let mockCommunityProfileModel: any;
  let mockAuditLogsService: any;
  let usernameService: UsernameService;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    mockCommunityProfileModel = {
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockAuditLogsService = {
      record: jest.fn().mockResolvedValue(true),
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
          provide: getModelToken(CommunityProfile.name),
          useValue: mockCommunityProfileModel,
        },
        {
          provide: UploadService,
          useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() },
        },
        {
          provide: SignedUrlService,
          useValue: {
            generateSignedImageUrl: jest.fn().mockImplementation((k) => `https://signed.cdn/${k}`),
          },
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
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

      const result = await service.claimUsername('user_123', 'desired_handle', '127.0.0.1');

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

      const result = await service.claimUsername('user_123', 'updated_handle', '127.0.0.1');
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

      const res = await service.changeUsername('user_123', 'new_handle', '127.0.0.1');
      expect(res.success).toBe(true);
      expect(res.user.username).toBe('new_handle');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USERNAME_CHANGED',
        }),
      );
      expect(mockCommunityProfileModel.updateOne).toHaveBeenCalledWith(
        { userId: 'user_123' },
        { $set: { username: 'new_handle' } },
        { upsert: false },
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

      const res = await service.changeUsername('user_123', 'fresh_handle', '127.0.0.1');
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

      await expect(
        service.changeUsername('user_123', 'admin'),
      ).rejects.toThrow(BadRequestException);
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

    it('should throw NotFoundException for non-existent student handle', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
