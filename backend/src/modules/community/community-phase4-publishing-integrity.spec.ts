import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PostService } from './services/post.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Types } from 'mongoose';
import { PostAudience, PostType } from './domain/post.model';

describe('Zeitnah Community — Phase 4: Publishing Workflow & Ownership Integrity', () => {
  let postService: PostService;
  let mockPostRepo: any;
  let mockOrgService: any;
  let mockGateway: any;
  let mockNotificationsService: any;

  const authUserA = new Types.ObjectId().toString();
  const authUserB = new Types.ObjectId().toString();
  const attackerUser = new Types.ObjectId().toString();

  const companyAId = new Types.ObjectId().toString();
  const companyBId = new Types.ObjectId().toString();
  const suspendedOrgId = new Types.ObjectId().toString();
  const deletedOrgId = new Types.ObjectId().toString();
  const nonExistentOrgId = new Types.ObjectId().toString();

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
      findById: jest.fn().mockImplementation((id) => {
        if (id === 'post-personal-a') {
          return Promise.resolve({
            _id: 'post-personal-a',
            authorId: authUserA,
            organizationId: null,
            content: 'Original personal post content',
            isDeleted: false,
          });
        }
        if (id === 'post-company-a') {
          return Promise.resolve({
            _id: 'post-company-a',
            authorId: authUserA,
            organizationId: companyAId,
            content: 'Original company post content',
            isDeleted: false,
          });
        }
        return Promise.resolve(null);
      }),
      findByIdPopulated: jest.fn().mockImplementation((id, userId) => {
        return Promise.resolve({
          _id: id,
          authorId: authUserA,
          content: 'Populated test content',
          organizationId: null,
          media: [],
        });
      }),
      update: jest.fn().mockResolvedValue(true),
      softDelete: jest.fn().mockResolvedValue(true),
      adjustRepostCount: jest.fn().mockResolvedValue(true),
    };

    mockOrgService = {
      validateCompanyPublishingAccess: jest
        .fn()
        .mockImplementation(async (userId, orgId) => {
          if (!Types.ObjectId.isValid(orgId)) {
            throw new BadRequestException('Invalid organization ID');
          }
          if (orgId === nonExistentOrgId) {
            throw new NotFoundException('Organization not found');
          }
          if (orgId === suspendedOrgId || orgId === deletedOrgId) {
            throw new ForbiddenException(
              'Organization is suspended or unavailable',
            );
          }
          // Only authUserA has publishing access for companyAId
          if (orgId === companyAId && userId === authUserA) {
            return {
              _id: companyAId,
              name: 'Company A Inc',
              createdBy: authUserA,
            };
          }
          // Only authUserB has publishing access for companyBId
          if (orgId === companyBId && userId === authUserB) {
            return {
              _id: companyBId,
              name: 'Company B Corp',
              createdBy: authUserB,
            };
          }
          // Attacker or unauthorized user: Following a company does NOT grant publishing access
          throw new ForbiddenException(
            'You do not have permission to publish as this company',
          );
        }),
      notifyFollowersOfNewPost: jest.fn().mockResolvedValue({ delivered: 10 }),
    };

    mockGateway = {
      emitPostCreated: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PostRepository, useValue: mockPostRepo },
        { provide: OrganizationsService, useValue: mockOrgService },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
  });

  describe('Feature B — Post Ownership & Authorization', () => {
    it('enforces backend authorId from authenticated token and ignores spoofed authorId in payload', async () => {
      const spoofedPayload = {
        authorId: attackerUser, // Attempt to spoof author identity
        content: 'Personal post with spoof attempt',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
      };

      const result = await postService.createPost(authUserA, spoofedPayload as any);

      expect(result).toBeDefined();
      const createdData = mockPostRepo.create.mock.calls[0][0];
      expect(createdData.authorId).toBe(authUserA);
      expect(createdData.authorId).not.toBe(attackerUser);
      expect(createdData.organizationId).toBeUndefined();
    });

    it('successfully authorizes company post when authenticated user is eligible publisher', async () => {
      const result = await postService.createPost(authUserA, {
        content: 'Official announcement from Company A',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
        organizationId: companyAId,
      });

      expect(result).toBeDefined();
      expect(
        mockOrgService.validateCompanyPublishingAccess,
      ).toHaveBeenCalledWith(authUserA, companyAId);

      const createdData = mockPostRepo.create.mock.calls[0][0];
      expect(createdData.authorId).toBe(authUserA);
      expect(createdData.organizationId).toBe(companyAId);
    });

    it('rejects company post when authenticated user has no company publishing access (e.g. is merely a follower)', async () => {
      await expect(
        postService.createPost(attackerUser, {
          content: 'Impersonating Company A without membership',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: companyAId,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.create).not.toHaveBeenCalled();
    });

    it('rejects company publishing when company is suspended or soft-deleted', async () => {
      await expect(
        postService.createPost(authUserA, {
          content: 'Attempting to publish under suspended company',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: suspendedOrgId,
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        postService.createPost(authUserA, {
          content: 'Attempting to publish under deleted company',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: deletedOrgId,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.create).not.toHaveBeenCalled();
    });

    it('rejects invalid or malformed organization ID', async () => {
      await expect(
        postService.createPost(authUserA, {
          content: 'Malformed org id test',
          type: PostType.TEXT,
          audience: PostAudience.PUBLIC,
          organizationId: 'malformed-not-an-objectid',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Feature C — Media & Post-Type Reliability', () => {
    it('blocks path traversal attempts in media URLs', async () => {
      await expect(
        postService.createPost(authUserA, {
          content: 'Path traversal attack in media',
          type: PostType.IMAGE,
          audience: PostAudience.PUBLIC,
          media: [
            {
              url: `https://s3.amazonaws.com/zeitnah/community/uploads/${authUserA}/../../secret.key`,
              type: 'image',
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks attaching media belonging to a different user', async () => {
      await expect(
        postService.createPost(authUserA, {
          content: 'Using user B media without permission',
          type: PostType.IMAGE,
          audience: PostAudience.PUBLIC,
          media: [
            {
              url: `https://s3.amazonaws.com/zeitnah/community/uploads/${authUserB}/private-photo.png`,
              type: 'image',
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects video posts with duration exceeding 90 seconds', async () => {
      await expect(
        postService.createPost(authUserA, {
          content: 'Overlength video test',
          type: PostType.VIDEO,
          audience: PostAudience.PUBLIC,
          media: [
            {
              url: `https://s3.amazonaws.com/zeitnah/community/uploads/${authUserA}/long_video.mp4`,
              type: 'video',
              duration: 95,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deduplicates identical media URLs in the same submission', async () => {
      const mediaUrl = `https://s3.amazonaws.com/zeitnah/community/uploads/${authUserA}/photo1.jpg`;

      await postService.createPost(authUserA, {
        content: 'Duplicate media test',
        type: PostType.IMAGE,
        audience: PostAudience.PUBLIC,
        media: [
          { url: mediaUrl, type: 'image' },
          { url: `${mediaUrl}?signature=xyz`, type: 'image' },
        ],
      });

      expect(mockPostRepo.createMedia).toHaveBeenCalledTimes(1);
      const mediaList = mockPostRepo.createMedia.mock.calls[0][0];
      expect(mediaList).toHaveLength(1);
      expect(mediaList[0].url).toBe(mediaUrl);
    });
  });

  describe('Feature D — Edits, Deletion & Mass-Assignment Prevention', () => {
    it('prevents mass assignment during updatePost: rejects attempts to reassign authorId or organizationId', async () => {
      const maliciousEdit = {
        content: 'Legitimate updated text',
        authorId: attackerUser, // Attempt to hijack author
        organizationId: companyBId, // Attempt to reassign company
        isDeleted: true, // Attempt to tamper deletion flag
        likesCount: 9999, // Attempt to tamper counter
      };

      await postService.updatePost(
        'post-personal-a',
        authUserA,
        'student',
        maliciousEdit as any,
      );

      expect(mockPostRepo.update).toHaveBeenCalledTimes(1);
      const updatePayload = mockPostRepo.update.mock.calls[0][1];

      // Must whitelist ONLY safe editable fields
      expect(updatePayload.content).toBe('Legitimate updated text');
      expect(updatePayload.isEdited).toBe(true);
      expect(updatePayload.authorId).toBeUndefined();
      expect(updatePayload.organizationId).toBeUndefined();
      expect(updatePayload.isDeleted).toBeUndefined();
      expect(updatePayload.likesCount).toBeUndefined();
    });

    it('rejects updatePost by an unauthorized user on a personal post', async () => {
      await expect(
        postService.updatePost(
          'post-personal-a',
          attackerUser,
          'student',
          { content: 'Unauthorized edit' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.update).not.toHaveBeenCalled();
    });

    it('allows company manager to edit company post even if different author', async () => {
      // Post created under company A, authUserA is company A manager
      const result = await postService.updatePost(
        'post-company-a',
        authUserA,
        'student',
        { content: 'Manager updated announcement' } as any,
      );

      expect(result).toBeDefined();
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        'post-company-a',
        expect.objectContaining({ content: 'Manager updated announcement' }),
      );
    });

    it('allows author to soft-delete their own post', async () => {
      const success = await postService.deletePost(
        'post-personal-a',
        authUserA,
        'student',
      );

      expect(success).toBe(true);
      expect(mockPostRepo.softDelete).toHaveBeenCalledWith('post-personal-a');
    });

    it('rejects deletePost by an unauthorized user on a personal post', async () => {
      await expect(
        postService.deletePost('post-personal-a', attackerUser, 'student'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.softDelete).not.toHaveBeenCalled();
    });

    it('allows authorized company manager to delete company post', async () => {
      const success = await postService.deletePost(
        'post-company-a',
        authUserA,
        'student',
      );

      expect(success).toBe(true);
      expect(mockPostRepo.softDelete).toHaveBeenCalledWith('post-company-a');
    });

    it('rejects former or unauthorized manager from deleting company post', async () => {
      await expect(
        postService.deletePost('post-company-a', attackerUser, 'student'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('Feature E — Notifications and Feed Consistency', () => {
    it('triggers notifyFollowersOfNewPost when a PUBLIC company post is created', async () => {
      await postService.createPost(authUserA, {
        content: 'Public company announcement',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
        organizationId: companyAId,
      });

      expect(mockOrgService.notifyFollowersOfNewPost).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger notifyFollowersOfNewPost for personal post creation', async () => {
      await postService.createPost(authUserA, {
        content: 'Personal post without company',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
      });

      expect(mockOrgService.notifyFollowersOfNewPost).not.toHaveBeenCalled();
    });

    it('does NOT trigger notifyFollowersOfNewPost for non-public company posts (e.g. COURSE / PRIVATE)', async () => {
      await postService.createPost(authUserA, {
        content: 'Restricted company course update',
        type: PostType.TEXT,
        audience: PostAudience.COURSE,
        organizationId: companyAId,
      });

      expect(mockOrgService.notifyFollowersOfNewPost).not.toHaveBeenCalled();
    });
  });
});
