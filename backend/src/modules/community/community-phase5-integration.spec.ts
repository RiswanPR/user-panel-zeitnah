import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostService } from './services/post.service';
import { StoryService } from './services/story.service';
import { PostController } from './controllers/post.controller';
import { PostRepository } from './repositories/mongo-post.repository';
import { StoryRepository } from './repositories/mongo-story.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Types } from 'mongoose';
import { PostAudience, PostType } from './domain/post.model';
import { StoryType } from './domain/story.model';
import { BusinessStatus, OrganizationVisibility } from '../organizations/schemas/organization.schema';

describe('Community Phase 5 — Business Profile ↔ Company Feed Integration Spec', () => {
  let postService: PostService;
  let storyService: StoryService;
  let postController: PostController;
  let mockPostRepo: any;
  let mockStoryRepo: any;
  let mockOrgService: any;
  let mockGateway: any;
  let mockNotificationsService: any;

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
        if (id === 'post-company-a-1') {
          return Promise.resolve({
            _id: 'post-company-a-1',
            authorId: userA,
            content: 'Company A engineering announcement',
            organizationId: companyAId,
            organization: {
              _id: companyAId,
              name: 'Zeitnah Academy',
              slug: 'zeitnah-academy',
              logo: 'https://cdn.zeitnah.com/academy.png',
            },
          });
        }
        if (id === 'post-company-b-1') {
          return Promise.resolve({
            _id: 'post-company-b-1',
            authorId: userB,
            content: 'Company B release notes',
            organizationId: companyBId,
            organization: {
              _id: companyBId,
              name: 'Zeitnah Labs',
              slug: 'zeitnah-labs',
              logo: 'https://cdn.zeitnah.com/labs.png',
            },
          });
        }
        return Promise.resolve({
          _id: id,
          authorId: userA,
          content: 'Personal post',
          organizationId: null,
          organization: null,
        });
      }),
      findFeed: jest.fn().mockImplementation((params) => {
        const { organizationId } = params;
        if (organizationId === companyAId) {
          return Promise.resolve({
            items: [
              {
                _id: 'post-company-a-1',
                authorId: userA,
                organizationId: companyAId,
                content: 'Company A engineering announcement',
                organization: {
                  _id: companyAId,
                  name: 'Zeitnah Academy',
                  slug: 'zeitnah-academy',
                  logo: 'https://cdn.zeitnah.com/academy.png',
                },
              },
            ],
            nextCursor: null,
          });
        }
        if (organizationId === companyBId) {
          return Promise.resolve({
            items: [
              {
                _id: 'post-company-b-1',
                authorId: userB,
                organizationId: companyBId,
                content: 'Company B release notes',
                organization: {
                  _id: companyBId,
                  name: 'Zeitnah Labs',
                  slug: 'zeitnah-labs',
                  logo: 'https://cdn.zeitnah.com/labs.png',
                },
              },
            ],
            nextCursor: null,
          });
        }
        // Personal feed
        return Promise.resolve({
          items: [
            {
              _id: 'post-personal-1',
              authorId: userA,
              content: 'Personal insights',
              organizationId: null,
              organization: null,
            },
          ],
          nextCursor: null,
        });
      }),
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
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          _id: id,
          authorId: userA,
          organizationId: null,
        });
      }),
      findByIdPopulated: jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          _id: id,
          authorId: userA,
          organizationId: null,
        });
      }),
      getActiveStories: jest.fn(),
    };

    mockOrgService = {
      validateCompanyFeedAccess: jest.fn().mockImplementation(async (userId, orgId) => {
        if (!Types.ObjectId.isValid(orgId)) {
          throw new BadRequestException('Invalid organization ID');
        }
        if (orgId === nonExistentCompanyId) {
          throw new NotFoundException('Organization not found');
        }
        if (orgId === suspendedCompanyId) {
          throw new ForbiddenException('Organization is suspended or unavailable');
        }
        return {
          _id: orgId,
          name: orgId === companyAId ? 'Zeitnah Academy' : 'Zeitnah Labs',
          slug: orgId === companyAId ? 'zeitnah-academy' : 'zeitnah-labs',
          status: BusinessStatus.APPROVED,
          visibility: OrganizationVisibility.PUBLIC,
        };
      }),
      validateCompanyPublishingAccess: jest.fn().mockImplementation(async (userId, orgId) => {
        if (!Types.ObjectId.isValid(orgId)) {
          throw new BadRequestException('Invalid organization ID');
        }
        if (orgId === nonExistentCompanyId) {
          throw new NotFoundException('Organization not found');
        }
        if (orgId === suspendedCompanyId) {
          throw new ForbiddenException('Organization is suspended or unavailable');
        }
        if (orgId === companyAId && userId === userA) {
          return { _id: companyAId, name: 'Zeitnah Academy', createdBy: userA };
        }
        if (orgId === companyBId && userId === userB) {
          return { _id: companyBId, name: 'Zeitnah Labs', createdBy: userB };
        }
        throw new ForbiddenException('You do not have permission to publish content for this organization');
      }),
    };

    mockGateway = {
      emitPostCreated: jest.fn(),
      emitStoryCreated: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
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
    postController = module.get<PostController>(PostController);
  });

  describe('Feed Access & Organization Scoping', () => {
    it('returns Company A feed items with correct company identity attached', async () => {
      const feed = await postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, companyAId);

      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].organizationId).toBe(companyAId);
      expect(feed.items[0].organization.name).toBe('Zeitnah Academy');
      expect(feed.items[0].organization.slug).toBe('zeitnah-academy');
      expect(mockOrgService.validateCompanyFeedAccess).toHaveBeenCalledWith(userA, companyAId);
    });

    it('returns Company B feed items independently from Company A', async () => {
      const feed = await postService.getFeed(userB, [], 10, undefined, 'all', undefined, undefined, companyBId);

      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].organizationId).toBe(companyBId);
      expect(feed.items[0].organization.name).toBe('Zeitnah Labs');
      expect(feed.items[0].organization.slug).toBe('zeitnah-labs');
      expect(mockOrgService.validateCompanyFeedAccess).toHaveBeenCalledWith(userB, companyBId);
    });

    it('returns Personal feed items when organizationId is omitted', async () => {
      const feed = await postService.getFeed(userA, [], 10);

      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].organizationId).toBeNull();
      expect(feed.items[0].organization).toBeNull();
      expect(mockOrgService.validateCompanyFeedAccess).not.toHaveBeenCalled();
    });

    it('rejects feed access for invalid or non-existent organization ID', async () => {
      await expect(
        postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, nonExistentCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects feed access for suspended organization', async () => {
      await expect(
        postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, suspendedCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Content Creation & Security Scoping', () => {
    it('creates Company A post with validated organizationId', async () => {
      await postService.createPost(userA, {
        content: 'New course announcement from Zeitnah Academy',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
        organizationId: companyAId,
      });

      expect(mockOrgService.validateCompanyPublishingAccess).toHaveBeenCalledWith(userA, companyAId);
      const call = mockPostRepo.create.mock.calls[0][0];
      expect(call.authorId).toBe(userA);
      expect(call.organizationId).toBe(companyAId);
      expect(call.content).toContain('New course announcement');
    });

    it('IDOR protection: rejects User A attempting to publish under Company B', async () => {
      await expect(
        postService.createPost(userA, {
          content: 'Spoofed post',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: companyBId,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates business story with validated organizationId', async () => {
      await storyService.createStory(userA, {
        type: StoryType.TEXT,
        text: 'Academy flash discount!',
        organizationId: companyAId,
      });

      expect(mockOrgService.validateCompanyPublishingAccess).toHaveBeenCalledWith(userA, companyAId);
      const call = mockStoryRepo.create.mock.calls[0][0];
      expect(call.authorId).toBe(userA);
      expect(call.organizationId).toBe(companyAId);
      expect(call.text).toBe('Academy flash discount!');
    });

    it('creates personal story without organizationId', async () => {
      await storyService.createStory(userA, {
        type: StoryType.TEXT,
        text: 'Personal quick status',
      });

      expect(mockOrgService.validateCompanyPublishingAccess).not.toHaveBeenCalled();
      const call = mockStoryRepo.create.mock.calls[0][0];
      expect(call.authorId).toBe(userA);
      expect(call.organizationId).toBeUndefined();
    });
  });

  describe('Content Retrieval Identity Integrity', () => {
    it('retrieves business post with populated organization identity', async () => {
      const post = await postService.getPostById('post-company-a-1', userA);
      expect(post._id).toBe('post-company-a-1');
      expect(post.organization).toBeDefined();
      expect(post.organization.name).toBe('Zeitnah Academy');
      expect(post.organization.slug).toBe('zeitnah-academy');
    });

    it('retrieves personal post with null organization identity', async () => {
      const post = await postService.getPostById('post-personal-1', userA);
      expect(post._id).toBe('post-personal-1');
      expect(post.organization).toBeNull();
    });
  });
});
