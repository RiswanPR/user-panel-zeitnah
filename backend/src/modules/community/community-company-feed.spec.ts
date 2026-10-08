import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostService } from './services/post.service';
import { PostController } from './controllers/post.controller';
import { PostRepository } from './repositories/mongo-post.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  OrganizationType,
  BusinessStatus,
  OrganizationVisibility,
} from '../organizations/schemas/organization.schema';
import { Types } from 'mongoose';

describe('Community Company Feed — Phase 3 Backend Scoping & Authorization', () => {
  let postService: PostService;
  let postController: PostController;
  let mockPostRepo: any;
  let mockOrgService: any;
  let mockGateway: any;
  let mockNotificationsService: any;

  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const companyAId = new Types.ObjectId().toString();
  const companyBId = new Types.ObjectId().toString();
  const nonExistentOrgId = new Types.ObjectId().toString();
  const suspendedOrgId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockPostRepo = {
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
                  name: 'Company A Inc',
                  slug: 'comp-a',
                  logo: 'https://example.com/a.png',
                },
                createdAt: new Date().toISOString(),
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
                content: 'Company B hiring update',
                organization: {
                  _id: companyBId,
                  name: 'Company B Corp',
                  slug: 'comp-b',
                  logo: 'https://example.com/b.png',
                },
                createdAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
          });
        }
        // Personal feed (no organizationId)
        return Promise.resolve({
          items: [
            {
              _id: 'post-personal-1',
              authorId: userA,
              content: 'Personal technical post',
              organization: null,
              createdAt: new Date().toISOString(),
            },
          ],
          nextCursor: null,
        });
      }),
      findById: jest.fn(),
      findByIdPopulated: jest.fn(),
      create: jest.fn(),
    };

    mockOrgService = {
      validateCompanyFeedAccess: jest.fn().mockImplementation(async (userId, orgId) => {
        if (!Types.ObjectId.isValid(orgId)) {
          throw new BadRequestException('Invalid organization ID');
        }
        if (orgId === 'non-existent-id' || orgId === nonExistentOrgId) {
          throw new NotFoundException('Organization not found');
        }
        if (orgId === suspendedOrgId) {
          throw new ForbiddenException('Organization is suspended or unavailable');
        }
        if (orgId === companyBId && userId === userA) {
          // IDOR: User A trying to access private Company B
          throw new ForbiddenException('You do not have permission to access this organization feed');
        }
        return {
          _id: orgId,
          name: orgId === companyAId ? 'Company A Inc' : 'Company B Corp',
          slug: orgId === companyAId ? 'comp-a' : 'comp-b',
          status: BusinessStatus.APPROVED,
          visibility: OrganizationVisibility.PUBLIC,
        };
      }),
    };

    mockGateway = {
      emitPostCreated: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        PostService,
        { provide: PostRepository, useValue: mockPostRepo },
        { provide: OrganizationsService, useValue: mockOrgService },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    postController = module.get<PostController>(PostController);
  });

  describe('1. Personal vs Company Feed Scoping', () => {
    it('returns only personal posts when organizationId is omitted (Personal Feed)', async () => {
      const feed = await postService.getFeed(userA, [], 10, undefined, 'all');

      expect(mockOrgService.validateCompanyFeedAccess).not.toHaveBeenCalled();
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userA,
          organizationId: undefined,
        }),
      );
      expect(feed.items).toHaveLength(1);
      expect(feed.items[0]._id).toBe('post-personal-1');
      expect(feed.items[0].organization).toBeNull();
    });

    it('returns Company A feed strictly scoped to companyAId', async () => {
      const feed = await postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, companyAId);

      expect(mockOrgService.validateCompanyFeedAccess).toHaveBeenCalledWith(userA, companyAId);
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userA,
          organizationId: companyAId,
        }),
      );
      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].organizationId).toBe(companyAId);
      expect(feed.items[0].organization.name).toBe('Company A Inc');
    });

    it('returns Company B feed strictly scoped to companyBId without mixing Company A or Personal posts', async () => {
      const feed = await postService.getFeed(userB, [], 10, undefined, 'all', undefined, undefined, companyBId);

      expect(mockOrgService.validateCompanyFeedAccess).toHaveBeenCalledWith(userB, companyBId);
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userB,
          organizationId: companyBId,
        }),
      );
      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].organizationId).toBe(companyBId);
      expect(feed.items[0].organization.name).toBe('Company B Corp');
    });

    it('guarantees Company A and Company B feeds return distinct, non-overlapping content', async () => {
      const feedA = await postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, companyAId);
      const feedB = await postService.getFeed(userB, [], 10, undefined, 'all', undefined, undefined, companyBId);

      expect(feedA.items[0]._id).not.toBe(feedB.items[0]._id);
      expect(feedA.items[0].organizationId).not.toBe(feedB.items[0].organizationId);
    });
  });

  describe('2. Security, Authorization & IDOR Protection', () => {
    it('blocks unauthorized access to private company feed with 403 Forbidden (IDOR Protection)', async () => {
      await expect(
        postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, companyBId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.findFeed).not.toHaveBeenCalled();
    });

    it('blocks access to suspended organization feed with 403 Forbidden', async () => {
      await expect(
        postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, suspendedOrgId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.findFeed).not.toHaveBeenCalled();
    });

    it('rejects invalid organization ID format with 400 Bad Request', async () => {
      await expect(
        postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, 'invalid-id-format!'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPostRepo.findFeed).not.toHaveBeenCalled();
    });

    it('returns 404 Not Found when organization does not exist', async () => {
      await expect(
        postService.getFeed(userA, [], 10, undefined, 'all', undefined, undefined, nonExistentOrgId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPostRepo.findFeed).not.toHaveBeenCalled();
    });
  });

  describe('3. Controller Query Parameter Forwarding', () => {
    it('forwards organizationId from query to postService.getFeed', async () => {
      const req = { user: { userId: userA, enrolledCourses: [] } };
      await postController.getFeed(req, 10, '', 'all', '', '', companyAId);

      expect(mockOrgService.validateCompanyFeedAccess).toHaveBeenCalledWith(userA, companyAId);
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userA,
          organizationId: companyAId,
        }),
      );
    });

    it('defaults to personal feed when organizationId is undefined in controller query', async () => {
      const req = { user: { userId: userA, enrolledCourses: [] } };
      await postController.getFeed(req, 10, '', 'all', '', '', undefined);

      expect(mockOrgService.validateCompanyFeedAccess).not.toHaveBeenCalled();
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userA,
          organizationId: undefined,
        }),
      );
    });
  });
});
