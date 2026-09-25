import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { User } from '../auth/schemas/user.schema';
import { Recommendation } from './schemas/recommendation.schema';
import { UploadService } from '../../common/aws/upload.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { UsernameService } from './services/username.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockUserModel: any;
  let mockRecommendationModel: any;
  let mockAuditLogsService: any;
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
      expect(mockUser.save).toHaveBeenCalled();
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
});
