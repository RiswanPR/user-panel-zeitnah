import { Types } from 'mongoose';
import { PostRepository } from './repositories/mongo-post.repository';

describe('Community Unified Following Feed & Company Feed — Phase 3 Backend Verification', () => {
  let repo: PostRepository;
  let mockPostModel: any;
  let capturedPipeline: any[];

  const currentUserId = new Types.ObjectId().toHexString();
  const followedUserA = new Types.ObjectId().toHexString();
  const followedUserB = new Types.ObjectId().toHexString();
  const eligibleCompanyA = new Types.ObjectId().toHexString();
  const eligibleCompanyB = new Types.ObjectId().toHexString();
  const suspendedCompany = new Types.ObjectId().toHexString();

  beforeEach(() => {
    capturedPipeline = [];

    const mockAggregate = jest.fn().mockImplementation((pipeline) => {
      capturedPipeline = pipeline;
      return {
        exec: jest.fn().mockResolvedValue([]),
      };
    });

    const mockDbCollection = jest
      .fn()
      .mockImplementation((collName: string) => {
        if (collName === 'organizations') {
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([
                {
                  _id: new Types.ObjectId(eligibleCompanyA),
                  visibility: 'PUBLIC',
                  status: 'APPROVED',
                  verificationStatus: 'VERIFIED',
                },
                {
                  _id: new Types.ObjectId(eligibleCompanyB),
                  visibility: 'PUBLIC',
                  status: 'APPROVED',
                  verificationStatus: 'VERIFIED',
                },
              ]),
            }),
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId(eligibleCompanyA),
              createdBy: new Types.ObjectId(),
              visibility: 'PUBLIC',
            }),
          };
        }

        if (collName === 'network_connections') {
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([
                {
                  requesterId: new Types.ObjectId(currentUserId),
                  recipientId: new Types.ObjectId(followedUserA),
                  status: 'accepted',
                },
                {
                  requesterId: new Types.ObjectId(followedUserB),
                  recipientId: new Types.ObjectId(currentUserId),
                  status: 'accepted',
                },
              ]),
            }),
          };
        }

        if (collName === 'organization_follows') {
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([
                {
                  userId: new Types.ObjectId(currentUserId),
                  organizationId: new Types.ObjectId(eligibleCompanyA),
                  notificationsEnabled: true,
                },
                {
                  userId: new Types.ObjectId(currentUserId),
                  organizationId: new Types.ObjectId(suspendedCompany),
                  notificationsEnabled: true,
                },
              ]),
            }),
          };
        }

        if (collName === 'organization_memberships') {
          return {
            findOne: jest.fn().mockResolvedValue(null),
          };
        }

        return {
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          findOne: jest.fn().mockResolvedValue(null),
        };
      });

    mockPostModel = {
      aggregate: mockAggregate,
      db: {
        collection: mockDbCollection,
      },
    };

    repo = new PostRepository(
      mockPostModel,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('Feature C: Unified Following Feed (Individuals + Companies)', () => {
    it('combines followed individuals and eligible followed companies in following feed ($or condition)', async () => {
      await repo.findFeed({
        userId: currentUserId,
        filter: 'following',
      });

      expect(capturedPipeline.length).toBeGreaterThan(0);
      const matchStage = capturedPipeline[0].$match;
      expect(matchStage).toBeDefined();

      // The match stage should contain an $and with the combined $or between personal following and company following
      const andConditions = matchStage.$and;
      expect(Array.isArray(andConditions)).toBe(true);

      const followingOr = andConditions.find(
        (c: any) => c.$or && c.$or.length === 2,
      );
      expect(followingOr).toBeDefined();

      const [personalCond, companyCond] = followingOr.$or;

      // Personal condition must scope to followed user IDs
      expect(personalCond.authorId.$in).toEqual(
        expect.arrayContaining([
          followedUserA,
          new Types.ObjectId(followedUserA),
          followedUserB,
          new Types.ObjectId(followedUserB),
        ]),
      );

      // Company condition must scope to eligible followed company IDs, excluding suspended company
      expect(companyCond.organizationId.$in).toEqual(
        expect.arrayContaining([
          eligibleCompanyA,
          new Types.ObjectId(eligibleCompanyA),
        ]),
      );
      expect(companyCond.audience).toBe('PUBLIC');

      // Ineligible/suspended company must NOT be in the condition
      const orgIdsInQuery = companyCond.organizationId.$in.map((id: any) =>
        String(id),
      );
      expect(orgIdsInQuery).not.toContain(suspendedCompany);
    });

    it('returns company posts in Following feed when user follows companies but 0 individuals', async () => {
      // Mock network_connections returning 0 connections
      mockPostModel.db.collection = jest
        .fn()
        .mockImplementation((collName: string) => {
          if (collName === 'network_connections') {
            return {
              find: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([]),
              }),
            };
          }
          if (collName === 'organization_follows') {
            return {
              find: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([
                  {
                    userId: new Types.ObjectId(currentUserId),
                    organizationId: new Types.ObjectId(eligibleCompanyA),
                  },
                ]),
              }),
            };
          }
          if (collName === 'organizations') {
            return {
              find: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([
                  {
                    _id: new Types.ObjectId(eligibleCompanyA),
                    visibility: 'PUBLIC',
                    status: 'APPROVED',
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
        });

      await repo.findFeed({
        userId: currentUserId,
        filter: 'following',
      });

      const matchStage = capturedPipeline[0].$match;
      expect(matchStage.organizationId.$in).toEqual(
        expect.arrayContaining([
          eligibleCompanyA,
          new Types.ObjectId(eligibleCompanyA),
        ]),
      );
      expect(matchStage.$and).toEqual(
        expect.arrayContaining([{ audience: 'PUBLIC' }]),
      );
    });

    it('returns empty result without executing aggregation if user follows 0 individuals and 0 companies', async () => {
      mockPostModel.db.collection = jest.fn().mockImplementation(() => ({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      }));

      const res = await repo.findFeed({
        userId: currentUserId,
        filter: 'following',
      });

      expect(res.items).toEqual([]);
      expect(res.nextCursor).toBeNull();
      expect(mockPostModel.aggregate).not.toHaveBeenCalled();
    });

    it('preserves deterministic sort by createdAt: -1, _id: -1 for mixed posts', async () => {
      await repo.findFeed({
        userId: currentUserId,
        filter: 'following',
      });

      const sortStage = capturedPipeline.find((s: any) => s.$sort);
      expect(sortStage).toBeDefined();
      expect(sortStage.$sort).toEqual({ createdAt: -1, _id: -1 });
    });
  });

  describe('Feature B: Public Company Profile Feed', () => {
    it('scopes Company Feed strictly to organizationId with isDeleted: false', async () => {
      await repo.findFeed({
        userId: currentUserId,
        organizationId: eligibleCompanyA,
        filter: 'all',
      });

      expect(capturedPipeline.length).toBeGreaterThan(0);
      const matchStage = capturedPipeline[0].$match;

      expect(matchStage.isDeleted).toBe(false);
      expect(matchStage.organizationId.$in).toEqual(
        expect.arrayContaining([
          eligibleCompanyA,
          new Types.ObjectId(eligibleCompanyA),
        ]),
      );
    });

    it('enforces audience: PUBLIC on company feed for external/non-member visitors', async () => {
      await repo.findFeed({
        userId: currentUserId,
        organizationId: eligibleCompanyA,
      });

      const matchStage = capturedPipeline[0].$match;
      expect(matchStage.$and).toEqual(
        expect.arrayContaining([{ audience: 'PUBLIC' }]),
      );
    });

    it('isolates Company A feed completely from Company B feed', async () => {
      await repo.findFeed({
        organizationId: eligibleCompanyA,
      });
      const matchA = capturedPipeline[0].$match;

      await repo.findFeed({
        organizationId: eligibleCompanyB,
      });
      const matchB = capturedPipeline[0].$match;

      expect(matchA.organizationId.$in).not.toEqual(matchB.organizationId.$in);
      expect(matchA.organizationId.$in).toContain(eligibleCompanyA);
      expect(matchB.organizationId.$in).toContain(eligibleCompanyB);
    });
  });
});
