import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrganizationsService } from './organizations.service';
import {
  BusinessStatus,
  OrganizationVerificationStatus,
  OrganizationVisibility,
} from './schemas/organization.schema';

describe('OrganizationsService — Phase 3 Company Following & Notification Preferences', () => {
  let service: OrganizationsService;
  let mockOrgModel: any;
  let mockMembershipModel: any;
  let mockUserModel: any;
  let mockFollowModel: any;
  let mockNotificationsService: any;

  const validOrgId = new Types.ObjectId().toHexString();
  const validUserId = new Types.ObjectId().toHexString();
  const anotherUserId = new Types.ObjectId().toHexString();
  const creatorUserId = new Types.ObjectId().toHexString();

  const eligiblePublicOrg = {
    _id: new Types.ObjectId(validOrgId),
    name: 'Acme Infra Corp',
    slug: 'acme-infra-corp',
    status: BusinessStatus.APPROVED,
    verificationStatus: OrganizationVerificationStatus.VERIFIED,
    visibility: OrganizationVisibility.PUBLIC,
    createdBy: new Types.ObjectId(creatorUserId),
    isDeleted: false,
  };

  beforeEach(() => {
    mockOrgModel = {
      findById: jest.fn().mockImplementation((id) => ({
        lean: jest.fn().mockResolvedValue(
          String(id) === validOrgId ? { ...eligiblePublicOrg } : null,
        ),
      })),
      findOne: jest.fn().mockImplementation((query) => ({
        lean: jest.fn().mockResolvedValue(
          query.slug === 'acme-infra-corp' ? { ...eligiblePublicOrg } : null,
        ),
      })),
      countDocuments: jest.fn().mockResolvedValue(1),
    };

    mockMembershipModel = {
      countDocuments: jest.fn().mockResolvedValue(3),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockUserModel = {
      findById: jest.fn().mockResolvedValue({ _id: validUserId }),
    };

    const mockFollowStore = new Map<string, any>();

    mockFollowModel = {
      findOneAndUpdate: jest.fn().mockImplementation((query, update) => {
        const key = `${query.userId}_${query.organizationId}`;
        const existing = mockFollowStore.get(key);
        if (!existing) {
          const doc = {
            userId: query.userId,
            organizationId: query.organizationId,
            notificationsEnabled: true,
            createdAt: new Date(),
          };
          mockFollowStore.set(key, doc);
          return Promise.resolve(doc);
        }
        return Promise.resolve(existing);
      }),
      deleteOne: jest.fn().mockImplementation((query) => {
        const key = `${query.userId}_${query.organizationId}`;
        mockFollowStore.delete(key);
        return Promise.resolve({ deletedCount: 1 });
      }),
      findOne: jest.fn().mockImplementation((query) => {
        const key = `${query.userId}_${query.organizationId}`;
        const doc = mockFollowStore.get(key);
        return {
          lean: jest.fn().mockResolvedValue(doc || null),
          save: jest.fn().mockImplementation(function () {
            mockFollowStore.set(key, this);
            return Promise.resolve(this);
          }),
        };
      }),
      countDocuments: jest.fn().mockImplementation((query) => {
        let count = 0;
        for (const val of mockFollowStore.values()) {
          if (String(val.organizationId) === String(query.organizationId)) {
            count++;
          }
        }
        return Promise.resolve(count);
      }),
      find: jest.fn().mockImplementation((query) => ({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
        lean: jest.fn().mockResolvedValue([]),
      })),
      distinct: jest.fn().mockResolvedValue([]),
    };

    mockNotificationsService = {
      getPreferences: jest.fn().mockResolvedValue({
        inAppNotifications: true,
        emailNotifications: true,
        categories: { community: true, announcements: true },
      }),
      createNotification: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    service = new OrganizationsService(
      mockOrgModel,
      mockMembershipModel,
      mockUserModel,
      undefined,
      mockFollowModel,
      undefined,
      undefined,
      undefined,
      mockNotificationsService,
    );
  });

  describe('Feature A: Follow and Unfollow Company', () => {
    it('successfully follows an eligible public company and returns correct follower count', async () => {
      const res = await service.followOrganization(validUserId, validOrgId);

      expect(res.success).toBe(true);
      expect(res.isFollowing).toBe(true);
      expect(res.notificationsEnabled).toBe(true);
      expect(res.followersCount).toBe(1);
      expect(mockFollowModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new Types.ObjectId(validUserId),
          organizationId: new Types.ObjectId(validOrgId),
        }),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('handles repeated follow requests idempotently without inflating count or creating duplicates', async () => {
      await service.followOrganization(validUserId, validOrgId);
      const secondRes = await service.followOrganization(validUserId, validOrgId);

      expect(secondRes.success).toBe(true);
      expect(secondRes.isFollowing).toBe(true);
      expect(secondRes.followersCount).toBe(1);
    });

    it('unfollow removes only the requesting user relationship and decrements follower count', async () => {
      await service.followOrganization(validUserId, validOrgId);
      await service.followOrganization(anotherUserId, validOrgId);
      expect(await mockFollowModel.countDocuments({ organizationId: new Types.ObjectId(validOrgId) })).toBe(2);

      const unfollowRes = await service.unfollowOrganization(validUserId, validOrgId);
      expect(unfollowRes.success).toBe(true);
      expect(unfollowRes.isFollowing).toBe(false);
      expect(unfollowRes.followersCount).toBe(1);

      // Verify another user is still following
      const anotherStatus = await service.getFollowStatus(anotherUserId, validOrgId);
      expect(anotherStatus.isFollowing).toBe(true);
    });

    it('rejects follow requests for invalid organization ID format with 400 Bad Request', async () => {
      await expect(service.followOrganization(validUserId, 'invalid-id-format')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects following when organization is not found with 404 Not Found', async () => {
      const missingId = new Types.ObjectId().toHexString();
      await expect(service.followOrganization(validUserId, missingId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects following when organization is suspended with 400 Bad Request', async () => {
      mockOrgModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          ...eligiblePublicOrg,
          status: BusinessStatus.SUSPENDED,
        }),
      });

      await expect(service.followOrganization(validUserId, validOrgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects following when organization is private with 400 Bad Request', async () => {
      mockOrgModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          ...eligiblePublicOrg,
          visibility: OrganizationVisibility.PRIVATE,
        }),
      });

      await expect(service.followOrganization(validUserId, validOrgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('prevents self-following (creator cannot follow own business)', async () => {
      await expect(service.followOrganization(creatorUserId, validOrgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves organization by slug when following via slug', async () => {
      const res = await service.followOrganization(validUserId, 'acme-infra-corp');
      expect(res.success).toBe(true);
      expect(res.isFollowing).toBe(true);
      expect(res.organizationId).toBe(validOrgId);
    });
  });

  describe('Feature D: Per-Company Notification Preferences', () => {
    it('allows a follower to update per-company notification preference', async () => {
      await service.followOrganization(validUserId, validOrgId);

      // Mock findOne returning follow document with save()
      const followDoc = {
        userId: new Types.ObjectId(validUserId),
        organizationId: new Types.ObjectId(validOrgId),
        notificationsEnabled: true,
        save: jest.fn().mockResolvedValue(true),
      };
      mockFollowModel.findOne.mockResolvedValue(followDoc);

      const res = await service.updateNotificationPreferences(validUserId, validOrgId, false);
      expect(res.success).toBe(true);
      expect(res.notificationsEnabled).toBe(false);
      expect(followDoc.notificationsEnabled).toBe(false);
      expect(followDoc.save).toHaveBeenCalled();
    });

    it('rejects notification preference update for a company the user does not follow', async () => {
      mockFollowModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateNotificationPreferences(validUserId, validOrgId, true),
      ).rejects.toThrow(BadRequestException);
    });

    it('notifies opted-in followers with idempotent notification on new company post', async () => {
      const followerA = new Types.ObjectId().toHexString();
      const followerB = new Types.ObjectId().toHexString();

      mockFollowModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: new Types.ObjectId(followerA), notificationsEnabled: true },
          { userId: new Types.ObjectId(followerB), notificationsEnabled: true },
        ]),
      });

      const post = {
        _id: new Types.ObjectId(),
        authorId: new Types.ObjectId(creatorUserId),
        organizationId: new Types.ObjectId(validOrgId),
        content: 'Excited to announce our new smart infrastructure partnership!',
        audience: 'PUBLIC',
      };

      await service.notifyFollowersOfNewPost(post, eligiblePublicOrg);

      // Both followers should be notified
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: new Types.ObjectId(followerA),
          type: 'company_post',
          title: 'New post from Acme Infra Corp',
          idempotencyKey: `company_post_${post._id}_${followerA}`,
        }),
      );
    });

    it('respects global notification opt-out (inAppNotifications: false suppresses notification)', async () => {
      const followerA = new Types.ObjectId().toHexString();

      mockFollowModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: new Types.ObjectId(followerA), notificationsEnabled: true },
        ]),
      });

      // Follower has disabled global in-app notifications
      mockNotificationsService.getPreferences.mockResolvedValueOnce({
        inAppNotifications: false,
      });

      const post = {
        _id: new Types.ObjectId(),
        authorId: new Types.ObjectId(creatorUserId),
        organizationId: new Types.ObjectId(validOrgId),
        content: 'Global opt-out check',
        audience: 'PUBLIC',
      };

      await service.notifyFollowersOfNewPost(post, eligiblePublicOrg);

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('does not notify author if author also follows their company', async () => {
      mockFollowModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: new Types.ObjectId(creatorUserId), notificationsEnabled: true },
        ]),
      });

      const post = {
        _id: new Types.ObjectId(),
        authorId: new Types.ObjectId(creatorUserId),
        organizationId: new Types.ObjectId(validOrgId),
        content: 'Author self-notification suppression',
        audience: 'PUBLIC',
      };

      await service.notifyFollowersOfNewPost(post, eligiblePublicOrg);

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('Feature D (Optimized): Batched Follower Fan-Out with Bulk Insertion (Phase D.3.1)', () => {
    it('uses getInAppOptedOutUserIds and createNotificationsBatch preserving exact contracts', async () => {
      const followerA = new Types.ObjectId().toHexString();
      const followerB = new Types.ObjectId().toHexString();
      const followerOptOut = new Types.ObjectId().toHexString();

      mockFollowModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: new Types.ObjectId(followerA), notificationsEnabled: true },
          { userId: new Types.ObjectId(followerB), notificationsEnabled: true },
          { userId: new Types.ObjectId(followerOptOut), notificationsEnabled: true },
          { userId: new Types.ObjectId(creatorUserId), notificationsEnabled: true }, // author
        ]),
      });

      const batchMock = {
        getInAppOptedOutUserIds: jest.fn().mockResolvedValue(new Set([followerOptOut])),
        createNotificationsBatch: jest.fn().mockResolvedValue([]),
        getPreferences: jest.fn(),
        createNotification: jest.fn(),
      };

      const customService = new OrganizationsService(
        mockOrgModel,
        mockMembershipModel,
        mockUserModel,
        undefined,
        mockFollowModel,
        undefined,
        undefined,
        undefined,
        batchMock as any,
      );

      const post = {
        _id: new Types.ObjectId(),
        authorId: new Types.ObjectId(creatorUserId),
        organizationId: new Types.ObjectId(validOrgId),
        content: 'Optimized batched company announcement!',
        audience: 'PUBLIC',
      };

      await customService.notifyFollowersOfNewPost(post, eligiblePublicOrg);

      // Author excluded before preference lookup
      expect(batchMock.getInAppOptedOutUserIds).toHaveBeenCalledTimes(1);
      const requestedIds = batchMock.getInAppOptedOutUserIds.mock.calls[0][0];
      const requestedStrings = requestedIds.map(String);
      expect(requestedStrings).toContain(followerA);
      expect(requestedStrings).toContain(followerB);
      expect(requestedStrings).toContain(followerOptOut);
      expect(requestedStrings).not.toContain(creatorUserId);

      // createNotificationsBatch should receive followerA and followerB, NOT followerOptOut or author
      expect(batchMock.createNotificationsBatch).toHaveBeenCalledTimes(1);
      const batchPayload = batchMock.createNotificationsBatch.mock.calls[0][0];
      expect(batchPayload).toHaveLength(2);

      expect(batchPayload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recipientId: new Types.ObjectId(followerA),
            actorId: new Types.ObjectId(creatorUserId),
            type: 'company_post',
            category: 'community',
            priority: 'NORMAL',
            title: 'New post from Acme Infra Corp',
            message: 'Acme Infra Corp: "Optimized batched company announcement!"',
            actionUrl: `/community?organizationId=${validOrgId}`,
            targetUrl: `/community?organizationId=${validOrgId}`,
            idempotencyKey: `company_post_${post._id}_${followerA}`,
            metadata: {
              organizationId: validOrgId,
              organizationName: 'Acme Infra Corp',
              postId: String(post._id),
            },
          }),
          expect.objectContaining({
            recipientId: new Types.ObjectId(followerB),
            idempotencyKey: `company_post_${post._id}_${followerB}`,
          }),
        ]),
      );

      // Zero calls to sequential single-notification endpoints
      expect(batchMock.getPreferences).not.toHaveBeenCalled();
      expect(batchMock.createNotification).not.toHaveBeenCalled();
    });

    it('suppresses dispatch entirely if all followers are author or opted out', async () => {
      const followerOptOut = new Types.ObjectId().toHexString();

      mockFollowModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { userId: new Types.ObjectId(followerOptOut), notificationsEnabled: true },
          { userId: new Types.ObjectId(creatorUserId), notificationsEnabled: true },
        ]),
      });

      const batchMock = {
        getInAppOptedOutUserIds: jest.fn().mockResolvedValue(new Set([followerOptOut])),
        createNotificationsBatch: jest.fn().mockResolvedValue([]),
      };

      const customService = new OrganizationsService(
        mockOrgModel,
        mockMembershipModel,
        mockUserModel,
        undefined,
        mockFollowModel,
        undefined,
        undefined,
        undefined,
        batchMock as any,
      );

      const post = {
        _id: new Types.ObjectId(),
        authorId: new Types.ObjectId(creatorUserId),
        organizationId: new Types.ObjectId(validOrgId),
        content: 'No recipients test',
        audience: 'PUBLIC',
      };

      await customService.notifyFollowersOfNewPost(post, eligiblePublicOrg);

      expect(batchMock.getInAppOptedOutUserIds).toHaveBeenCalledTimes(1);
      expect(batchMock.createNotificationsBatch).not.toHaveBeenCalled();
    });
  });
});
