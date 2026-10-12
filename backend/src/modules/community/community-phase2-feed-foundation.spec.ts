import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PostRepository } from './repositories/mongo-post.repository';
import { PostService } from './services/post.service';
import { PostController } from './controllers/post.controller';
import { OrganizationsService } from '../organizations/organizations.service';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BusinessStatus,
  OrganizationVisibility,
  OrganizationVerificationStatus,
} from '../organizations/schemas/organization.schema';

describe('Zeitnah Community — Phase 2: Feed Foundation & Backend Reliability', () => {
  let repo: PostRepository;
  let postService: PostService;
  let postController: PostController;
  let capturedPipeline: any[] = [];

  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const userC = new Types.ObjectId().toString();

  const publicCompanyId = new Types.ObjectId().toString();
  const privateCompanyId = new Types.ObjectId().toString();
  const suspendedCompanyId = new Types.ObjectId().toString();
  const deletedCompanyId = new Types.ObjectId().toString();
  const pendingCompanyId = new Types.ObjectId().toString();

  let mockPostModel: any;
  let mockSavedModel: any;
  let mockOrgService: any;
  let mockGateway: any;
  let mockNotificationsService: any;

  beforeEach(async () => {
    capturedPipeline = [];

    mockPostModel = {
      aggregate: jest.fn().mockImplementation((pipeline) => {
        capturedPipeline = pipeline;
        return {
          exec: jest.fn().mockResolvedValue([
            {
              _id: 'post-1',
              authorId: userA,
              content: 'Test content',
              createdAt: new Date(),
            },
          ]),
        };
      }),
      db: {
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'organizations') {
            return {
              find: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([
                  {
                    _id: new Types.ObjectId(publicCompanyId),
                    visibility: OrganizationVisibility.PUBLIC,
                    status: BusinessStatus.APPROVED,
                    verificationStatus: OrganizationVerificationStatus.VERIFIED,
                    isDeleted: false,
                  },
                ]),
              }),
            };
          }
          if (name === 'network_connections') {
            return {
              find: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([
                  {
                    requesterId: new Types.ObjectId(userA),
                    recipientId: new Types.ObjectId(userB),
                    status: 'accepted',
                  },
                ]),
              }),
            };
          }
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
            }),
          };
        }),
      },
    };

    mockSavedModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ postId: 'saved-post-1' }]),
        }),
      }),
    };

    mockOrgService = {
      validateCompanyFeedAccess: jest
        .fn()
        .mockImplementation(async (userId, orgId) => {
          if (!Types.ObjectId.isValid(orgId)) {
            throw new BadRequestException('Invalid organization ID');
          }
          if (orgId === suspendedCompanyId) {
            throw new ForbiddenException(
              'Organization is suspended or unavailable',
            );
          }
          if (orgId === privateCompanyId && userId !== userA) {
            throw new ForbiddenException(
              'You do not have permission to access this organization feed',
            );
          }
          if (orgId === 'non-existent-id') {
            throw new NotFoundException('Organization not found');
          }
          return {
            _id: orgId,
            name: 'Public Test Org',
            status: BusinessStatus.APPROVED,
            visibility: OrganizationVisibility.PUBLIC,
          };
        }),
      validateCompanyPublishingAccess: jest.fn().mockResolvedValue(true),
    };

    mockGateway = { emitPostCreated: jest.fn() };
    mockNotificationsService = { createNotification: jest.fn() };

    repo = new PostRepository(
      mockPostModel,
      {} as any,
      {} as any,
      mockSavedModel,
      {} as any,
      {} as any,
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        PostService,
        { provide: PostRepository, useValue: repo },
        { provide: OrganizationsService, useValue: mockOrgService },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    postController = module.get<PostController>(PostController);
  });

  describe('Objective 1 — Correct General Community Feed', () => {
    it('Scenario 1: Eligible personal posts appear in general feed', async () => {
      await repo.findFeed({ userId: userA, filter: 'all' });

      expect(capturedPipeline.length).toBeGreaterThan(0);
      const matchStage = capturedPipeline[0].$match;
      expect(matchStage.isDeleted).toBe(false);

      const audienceCond = matchStage.$and.find((c: any) =>
        Array.isArray(c.$or),
      );
      expect(audienceCond).toBeDefined();

      // Personal branch matches posts without organizationId and viewer/public audience
      const personalBranch = audienceCond.$or[0];
      expect(personalBranch.$and[0].$or).toEqual([
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: '' },
      ]);
      expect(personalBranch.$and[1].$or).toEqual(
        expect.arrayContaining([
          { audience: 'PUBLIC' },
          { authorId: userA },
        ]),
      );
    });

    it('Scenario 2: Eligible public company posts appear in general feed', async () => {
      await repo.findFeed({ userId: userA, filter: 'all' });

      const matchStage = capturedPipeline[0].$match;
      const audienceCond = matchStage.$and.find((c: any) =>
        Array.isArray(c.$or),
      );
      expect(audienceCond).toBeDefined();

      // Company branch matches approved/verified public organization
      const companyBranch = audienceCond.$or[1];
      expect(companyBranch.$and[0].organizationId.$in).toEqual(
        expect.arrayContaining([
          publicCompanyId,
          new Types.ObjectId(publicCompanyId),
        ]),
      );
      expect(companyBranch.$and[1].audience).toBe('PUBLIC');
    });

    it('Scenario 3: Ineligible or private company posts remain excluded from general feed', async () => {
      // Return only private, suspended, deleted, or unverified draft orgs
      mockPostModel.db.collection.mockImplementation((collName: string) => {
        if (collName === 'organizations') {
          return {
            find: jest.fn().mockImplementation((query) => {
              // Verify the query strictly filters out ineligible states
              expect(query.visibility).toBe('PUBLIC');
              expect(query.status.$nin).toEqual(
                expect.arrayContaining(['SUSPENDED', 'REJECTED', 'DELETED']),
              );
              expect(query.isDeleted).toEqual({ $ne: true });
              return {
                toArray: jest.fn().mockResolvedValue([]), // Nothing eligible
              };
            }),
          };
        }
        return {
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        };
      });

      await repo.findFeed({ userId: userA, filter: 'all' });

      const matchStage = capturedPipeline[0].$match;
      // When no organizations meet eligibility criteria, company branch is NOT included
      const audienceCond = matchStage.$and.find(
        (c: any) => c.$and && Array.isArray(c.$and[0]?.$or),
      );
      expect(audienceCond).toBeDefined();
      expect(audienceCond.$and[0].$or).toEqual([
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: '' },
      ]);
    });

    it('Scenario 4: Company-specific feeds do not include unrelated organizations posts', async () => {
      await repo.findFeed({
        userId: userA,
        organizationId: publicCompanyId,
        filter: 'all',
      });

      const matchStage = capturedPipeline[0].$match;
      expect(matchStage.organizationId.$in).toEqual(
        expect.arrayContaining([
          publicCompanyId,
          new Types.ObjectId(publicCompanyId),
        ]),
      );
      // Unrelated company is NOT in query
      expect(matchStage.organizationId.$in).not.toContain(privateCompanyId);
      expect(matchStage.authorId).toBeUndefined();
    });

    it('Scenario 5: Personal-only feed behavior remains correctly scoped when filter=personal', async () => {
      await repo.findFeed({ userId: userA, filter: 'personal' });

      const matchStage = capturedPipeline[0].$match;
      const personalCond = matchStage.$and.find(
        (c: any) =>
          c.$and &&
          Array.isArray(c.$and[0]?.$or) &&
          c.$and[0].$or.some((item: any) => item.organizationId !== undefined),
      );
      expect(personalCond).toBeDefined();
      expect(personalCond.$and[0].$or).toEqual([
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: '' },
      ]);
    });
  });

  describe('Objective 2 — Following Feed ID Handling', () => {
    it('Scenario 6: Following feed queries network_connections using Types.ObjectId', async () => {
      const mockFind = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            requesterId: new Types.ObjectId(userA),
            recipientId: new Types.ObjectId(userB),
            status: 'accepted',
          },
        ]),
      });

      mockPostModel.db.collection.mockImplementation((collName: string) => {
        if (collName === 'network_connections') {
          return { find: mockFind };
        }
        return {
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        };
      });

      await repo.findFeed({ userId: userA, filter: 'following' });

      expect(mockFind).toHaveBeenCalled();
      const filterArg = mockFind.mock.calls[0][0];

      // Verifies string ID was converted and both string and ObjectId are queried
      expect(filterArg.$or[0].recipientId.$in).toEqual(
        expect.arrayContaining([userA, new Types.ObjectId(userA)]),
      );
      expect(filterArg.$or[1].requesterId.$in).toEqual(
        expect.arrayContaining([userA, new Types.ObjectId(userA)]),
      );

      const matchStage = capturedPipeline[0].$match;
      expect(matchStage.authorId.$in).toEqual(
        expect.arrayContaining([userB, new Types.ObjectId(userB)]),
      );
    });

    it('Scenario 7: Users cannot retrieve another users restricted feed by changing an identifier', async () => {
      // User B attempting to view private Company feed owned by User A -> 403 Forbidden
      await expect(
        postService.getFeed(
          userB,
          [],
          10,
          undefined,
          'all',
          undefined,
          undefined,
          privateCompanyId,
        ),
      ).rejects.toThrow(ForbiddenException);

      // User attempting to view suspended company feed -> 403 Forbidden
      await expect(
        postService.getFeed(
          userA,
          [],
          10,
          undefined,
          'all',
          undefined,
          undefined,
          suspendedCompanyId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Objective 3 — Deterministic Cursor Pagination', () => {
    it('Scenario 8: Pagination handles identical timestamps without skipping posts via ID tie-breaker', async () => {
      const timestamp = new Date('2026-10-09T15:00:00.000Z');
      const postsPage1 = [
        { _id: 'post-uuid-z', createdAt: timestamp },
        { _id: 'post-uuid-m', createdAt: timestamp }, // Last of limit=2
        { _id: 'post-uuid-a', createdAt: timestamp }, // Extra item
      ];

      mockPostModel.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([...postsPage1]),
      });

      const page1 = await repo.findFeed({
        userId: userA,
        filter: 'all',
        limit: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.items[0]._id).toBe('post-uuid-z');
      expect(page1.items[1]._id).toBe('post-uuid-m');
      // Cursor strictly incorporates the last item's timestamp AND id
      expect(page1.nextCursor).toBe(
        `${timestamp.toISOString()}_post-uuid-m`,
      );

      // Now request Page 2 using that exact cursor
      await repo.findFeed({
        userId: userA,
        filter: 'all',
        limit: 2,
        cursor: page1.nextCursor!,
      });

      const page2Match = capturedPipeline[0].$match;
      expect(page2Match.$and).toBeDefined();

      const cursorCondition = page2Match.$and.find(
        (c: any) =>
          Array.isArray(c.$or) &&
          c.$or.some(
            (item: any) =>
              item.createdAt?.$lt !== undefined || item._id?.$lt !== undefined,
          ),
      );
      expect(cursorCondition).toBeDefined();

      // Guarantees: createdAt < T OR (createdAt == T AND _id < 'post-uuid-m')
      expect(cursorCondition.$or[0].createdAt.$lt).toEqual(timestamp);
      expect(cursorCondition.$or[1].createdAt).toEqual(timestamp);
      expect(cursorCondition.$or[1]._id.$lt).toBe('post-uuid-m');
    });

    it('Scenario 9: Invalid or malformed cursors fail safely without throwing', async () => {
      for (const badCursor of [
        'not-a-date',
        'undefined',
        'null',
        '2026-99-99T99:99:99Z',
        '{"invalid": "json"}',
        '',
      ]) {
        await repo.findFeed({
          userId: userA,
          filter: 'all',
          cursor: badCursor,
        });

        const matchStage = capturedPipeline[0].$match;
        expect(matchStage.createdAt).toBeUndefined();
      }
    });

    it('Scenario 10: Existing sorting, filters, media, and post ownership remain intact', async () => {
      // 1. Video / Reels filter maintains videoCondition and generalAudience
      await repo.findFeed({
        userId: userA,
        filter: 'video',
      });

      const videoMatch = capturedPipeline[0].$match;
      const videoCond = videoMatch.$and.find(
        (c: any) =>
          Array.isArray(c.$or) &&
          c.$or.some((item: any) => item.type === 'VIDEO'),
      );
      expect(videoCond).toBeDefined();

      // 2. Saved filter maintains saved post ID constraint and generalAudience
      await repo.findFeed({
        userId: userA,
        filter: 'saved',
      });

      const savedMatch = capturedPipeline[0].$match;
      expect(savedMatch._id).toBeDefined();
      expect(savedMatch._id.$in).toContain('saved-post-1');

      // 3. Pipeline maintains deterministic tie-breaker sorting: createdAt: -1, _id: -1
      const sortStage = capturedPipeline.find((s: any) => s.$sort);
      expect(sortStage).toBeDefined();
      expect(sortStage.$sort).toEqual({ createdAt: -1, _id: -1 });
    });
  });
});
