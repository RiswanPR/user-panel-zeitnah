import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PostService } from './services/post.service';
import { StoryService } from './services/story.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { StoryRepository } from './repositories/mongo-story.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Types } from 'mongoose';
import { PostAudience, PostType } from './domain/post.model';
import { StoryType } from './domain/story.model';

describe('Community Business Content Creation — Phase 4 Backend Validation', () => {
  let postService: PostService;
  let storyService: StoryService;
  let mockPostRepo: any;
  let mockStoryRepo: any;
  let mockOrgService: any;
  let mockGateway: any;

  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const companyAId = new Types.ObjectId().toString();
  const companyBId = new Types.ObjectId().toString();
  const suspendedCompanyId = new Types.ObjectId().toString();
  const nonExistentCompanyId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockPostRepo = {
      create: jest.fn().mockImplementation((data) => {
        return Promise.resolve({
          _id: new Types.ObjectId().toString(),
          ...data,
          createdAt: new Date(),
        });
      }),
      createMedia: jest.fn().mockResolvedValue([]),
      createPoll: jest.fn().mockResolvedValue(null),
      findByIdPopulated: jest.fn().mockImplementation((id, userId) => {
        return Promise.resolve({
          _id: id,
          authorId: userA,
          content: 'Test content',
          organizationId: null,
          media: [],
        });
      }),
      findFeed: jest.fn(),
    };

    mockStoryRepo = {
      create: jest.fn().mockImplementation((data) => {
        return Promise.resolve({
          _id: new Types.ObjectId().toString(),
          ...data,
          createdAt: new Date(),
        });
      }),
      createMedia: jest.fn().mockResolvedValue([]),
      findByIdPopulated: jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          _id: id,
          authorId: userA,
          organizationId: null,
        });
      }),
      findById: jest.fn(),
      softDelete: jest.fn().mockResolvedValue(true),
      getActiveStories: jest.fn(),
    };

    mockOrgService = {
      validateCompanyPublishingAccess: jest
        .fn()
        .mockImplementation(async (userId, orgId) => {
          if (!Types.ObjectId.isValid(orgId)) {
            throw new BadRequestException('Invalid organization ID');
          }
          if (orgId === nonExistentCompanyId) {
            throw new NotFoundException('Organization not found');
          }
          if (orgId === suspendedCompanyId) {
            throw new ForbiddenException(
              'Organization is suspended or unavailable',
            );
          }
          if (orgId === companyAId && userId === userA) {
            return { _id: companyAId, name: 'Company A Inc', createdBy: userA };
          }
          if (orgId === companyBId && userId === userB) {
            return {
              _id: companyBId,
              name: 'Company B Corp',
              createdBy: userB,
            };
          }
          // Cross-company unauthorized publishing attempt
          throw new ForbiddenException(
            'You do not have permission to publish content for this organization',
          );
        }),
    };

    mockGateway = {
      emitPostCreated: jest.fn(),
      emitStoryCreated: jest.fn(),
    };

    const mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        StoryService,
        { provide: PostRepository, useValue: mockPostRepo },
        { provide: StoryRepository, useValue: mockStoryRepo },
        { provide: OrganizationsService, useValue: mockOrgService },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    storyService = module.get<StoryService>(StoryService);
  });

  describe('Post Creation (Personal vs Business)', () => {
    it('creates personal post with organizationId null/absent', async () => {
      const result = await postService.createPost(userA, {
        content: 'Personal engineering insight',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
      });

      expect(result).toBeDefined();
      const createdPayload = mockPostRepo.create.mock.calls[0][0];
      expect(createdPayload.authorId).toBe(userA);
      expect(createdPayload.content).toBe('Personal engineering insight');
      expect(createdPayload.organizationId).toBeUndefined();
      expect(
        mockOrgService.validateCompanyPublishingAccess,
      ).not.toHaveBeenCalled();
    });

    it('creates business post with activeBusinessId attached', async () => {
      const result = await postService.createPost(userA, {
        content: 'Company A technical announcement',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
        organizationId: companyAId,
      });

      expect(result).toBeDefined();
      expect(
        mockOrgService.validateCompanyPublishingAccess,
      ).toHaveBeenCalledWith(userA, companyAId);
      expect(mockPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: userA,
          content: 'Company A technical announcement',
          organizationId: companyAId,
        }),
      );
    });

    it('rejects post publishing when user does not belong to the business (IDOR protection)', async () => {
      await expect(
        postService.createPost(userA, {
          content: 'Attempting to post as Company B without permissions',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: companyBId,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.create).not.toHaveBeenCalled();
    });

    it('rejects post publishing when company is suspended', async () => {
      await expect(
        postService.createPost(userA, {
          content: 'Posting under suspended business',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: suspendedCompanyId,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.create).not.toHaveBeenCalled();
    });

    it('rejects post publishing with invalid organization ID format', async () => {
      await expect(
        postService.createPost(userA, {
          content: 'Invalid ID test',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: 'invalid-hex-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects post publishing when organization is not found', async () => {
      await expect(
        postService.createPost(userA, {
          content: 'Non existent company',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: nonExistentCompanyId,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Reel Creation (Personal vs Business)', () => {
    it('creates personal Reel with type VIDEO and organizationId absent', async () => {
      const result = await postService.createPost(userA, {
        content: 'Personal technical Reel breakdown',
        type: 'VIDEO' as any,
        audience: 'PUBLIC' as any,
        media: [
          {
            url: `https://s3.amazonaws.com/zeitnah/community/uploads/${userA}/reel.mp4`,
            type: 'video',
            duration: 45,
          },
        ],
      });

      expect(result).toBeDefined();
      const createdPayload = mockPostRepo.create.mock.calls[0][0];
      expect(createdPayload.authorId).toBe(userA);
      expect(createdPayload.type).toBe('VIDEO');
      expect(createdPayload.organizationId).toBeUndefined();
    });

    it('creates business Reel with type VIDEO and organizationId attached', async () => {
      const result = await postService.createPost(userA, {
        content: 'Company A official project Reel',
        type: 'VIDEO' as any,
        audience: 'PUBLIC' as any,
        organizationId: companyAId,
        media: [
          {
            url: `https://s3.amazonaws.com/zeitnah/community/uploads/${userA}/comp_a_reel.mp4`,
            type: 'video',
            duration: 60,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(
        mockOrgService.validateCompanyPublishingAccess,
      ).toHaveBeenCalledWith(userA, companyAId);
      expect(mockPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: userA,
          type: 'VIDEO',
          organizationId: companyAId,
        }),
      );
    });

    it('rejects business Reel publishing if user is not authorized for company', async () => {
      await expect(
        postService.createPost(userA, {
          content: 'Unauthorized Reel',
          type: PostType.VIDEO,
          audience: PostAudience.PUBLIC,
          organizationId: companyBId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Story Creation (Personal vs Business)', () => {
    it('creates personal Story with organizationId absent', async () => {
      const result = await storyService.createStory(userA, {
        type: StoryType.TEXT,
        text: 'Personal daily standup story',
      });

      expect(result).toBeDefined();
      expect(mockStoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: userA,
          text: 'Personal daily standup story',
          organizationId: undefined,
        }),
      );
    });

    it('creates business Story with organizationId attached', async () => {
      const result = await storyService.createStory(userA, {
        type: StoryType.TEXT,
        text: 'Company A live field update',
        organizationId: companyAId,
      });

      expect(result).toBeDefined();
      expect(
        mockOrgService.validateCompanyPublishingAccess,
      ).toHaveBeenCalledWith(userA, companyAId);
      expect(mockStoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: userA,
          text: 'Company A live field update',
          organizationId: companyAId,
        }),
      );
    });

    it('rejects business Story publishing if user is unauthorized', async () => {
      await expect(
        storyService.createStory(userA, {
          type: StoryType.TEXT,
          text: 'Unauthorized story attempt',
          organizationId: companyBId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Multi-Business Isolation & Scoping Guarantee', () => {
    it('Company A content receives Company A ID, Company B content receives Company B ID', async () => {
      // User A publishes for Company A
      await postService.createPost(userA, {
        content: 'Post by Company A',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
        organizationId: companyAId,
      });
      expect(mockPostRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          organizationId: companyAId,
        }),
      );

      // User B publishes for Company B
      await postService.createPost(userB, {
        content: 'Post by Company B',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
        organizationId: companyBId,
      });
      expect(mockPostRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          organizationId: companyBId,
        }),
      );

      // Story for Company A
      await storyService.createStory(userA, {
        type: StoryType.TEXT,
        text: 'Story by Company A',
        organizationId: companyAId,
      });
      expect(mockStoryRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          organizationId: companyAId,
        }),
      );

      // Story for Company B
      await storyService.createStory(userB, {
        type: StoryType.TEXT,
        text: 'Story by Company B',
        organizationId: companyBId,
      });
      expect(mockStoryRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          organizationId: companyBId,
        }),
      );
    });
  });

  describe('Story Deletion Authorization Regression (ObjectId & String Identity & Org Manager)', () => {
    it('allows story author to delete story when authorId is an ObjectId', async () => {
      const authorObjectId = new Types.ObjectId();
      const storyId = new Types.ObjectId().toString();
      mockStoryRepo.findById.mockResolvedValue({
        _id: storyId,
        authorId: authorObjectId,
      });

      const result = await storyService.deleteStory(
        storyId,
        authorObjectId.toString(),
        'user',
      );
      expect(result).toBe(true);
    });

    it('allows organization publishing authority to delete company story even if not author', async () => {
      const authorId = userB;
      const orgOwnerId = userA;
      const storyId = new Types.ObjectId().toString();
      mockStoryRepo.findById.mockResolvedValue({
        _id: storyId,
        authorId,
        organizationId: companyAId,
      });

      const result = await storyService.deleteStory(
        storyId,
        orgOwnerId,
        'user',
      );
      expect(result).toBe(true);
      expect(mockOrgService.validateCompanyPublishingAccess).toHaveBeenCalledWith(
        orgOwnerId,
        companyAId,
      );
    });

    it('blocks non-owner non-admin user without org authority from deleting story', async () => {
      const authorId = new Types.ObjectId().toString();
      const otherUserId = new Types.ObjectId().toString();
      const storyId = new Types.ObjectId().toString();
      mockStoryRepo.findById.mockResolvedValue({
        _id: storyId,
        authorId,
      });

      await expect(
        storyService.deleteStory(storyId, otherUserId, 'user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
