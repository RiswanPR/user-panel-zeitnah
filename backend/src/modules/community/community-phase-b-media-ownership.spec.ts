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
import { CommunityS3Service } from './services/community-s3.service';
import { S3Service } from '../../common/aws/s3.service';
import { PostType, PostAudience } from './domain/post.model';

describe('Zeitnah Community — Phase B: Company Post Media Ownership Fix', () => {
  let postService: PostService;
  let communityS3Service: CommunityS3Service;
  let mockPostRepo: any;
  let mockOrgService: any;
  let mockGateway: any;
  let mockNotificationsService: any;
  let mockS3Service: any;

  const userA = '670000000000000000000001';
  const manager1 = '670000000000000000000002';
  const manager2 = '670000000000000000000003';
  const unauthorizedUser = '670000000000000000000004';
  const victimUser = '670000000000000000000005';
  const companyOrgId = '670000000000000000000010';

  const s3Bucket = 'zeitnah-media';
  const s3Base = `https://${s3Bucket}.s3.eu-central-1.amazonaws.com`;

  beforeEach(async () => {
    mockPostRepo = {
      findById: jest.fn(),
      findByIdPopulated: jest.fn(),
      update: jest.fn().mockResolvedValue(true),
      replaceMedia: jest.fn().mockResolvedValue(true),
      findMediaByPostId: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      createMedia: jest.fn().mockResolvedValue(true),
    };

    mockOrgService = {
      validateCompanyPublishingAccess: jest.fn().mockImplementation(async (userId, orgId) => {
        if (orgId === companyOrgId && (userId === manager1 || userId === manager2)) {
          return true;
        }
        throw new ForbiddenException('Forbidden: user has no publishing access for this organization');
      }),
      notifyFollowersOfNewPost: jest.fn().mockResolvedValue(true),
    };

    mockGateway = {
      emitPostCreated: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn(),
    };

    mockS3Service = {
      bucketName: s3Bucket,
      s3Client: {},
    };

    // Instantiate real CommunityS3Service to enforce real canonical S3 path & IDOR validation
    communityS3Service = new CommunityS3Service(mockS3Service as S3Service);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PostRepository, useValue: mockPostRepo },
        { provide: OrganizationsService, useValue: mockOrgService },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CommunityS3Service, useValue: communityS3Service },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
  });

  describe('1. Original Post Creator Editing & Retaining Existing Media', () => {
    it('allows the original creator to edit their personal post and retain original media', async () => {
      const postId = 'post-user-a-1';
      const originalMediaUrl = `${s3Base}/community/uploads/${userA}/diagram.png`;

      const existingPost = {
        _id: postId,
        authorId: userA,
        organizationId: undefined,
        content: 'Original draft',
        type: PostType.IMAGE,
        media: [
          {
            url: originalMediaUrl,
            type: 'image',
            size: 204800,
            mimeType: 'image/png',
          },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...existingPost,
        content: 'Updated draft',
      });

      const result = await postService.updatePost(
        postId,
        userA,
        'student',
        {
          content: 'Updated draft',
          media: [
            {
              url: originalMediaUrl,
              type: 'image',
            },
          ],
        } as any,
      );

      expect(result).toBeDefined();
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          content: 'Updated draft',
          isEdited: true,
          media: expect.arrayContaining([
            expect.objectContaining({
              url: originalMediaUrl,
              type: 'image',
              size: 204800,
            }),
          ]),
        }),
      );
      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(
        postId,
        expect.arrayContaining([
          expect.objectContaining({
            postId,
            url: originalMediaUrl,
          }),
        ]),
      );
    });
  });

  describe('2. Authorized Current Company Manager Retaining Media Uploaded by Another Manager', () => {
    it('allows Manager 2 to retain media originally uploaded by Manager 1 on a company post', async () => {
      const postId = 'post-company-1';
      const manager1MediaUrl = `${s3Base}/community/uploads/${manager1}/deck-slide.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Original company announcement',
        type: PostType.IMAGE,
        media: [
          {
            url: manager1MediaUrl,
            type: 'image',
            size: 512000,
            mimeType: 'image/jpeg',
            width: 1920,
            height: 1080,
          },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...existingPost,
        content: 'Manager 2 updated announcement',
      });

      const result = await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          content: 'Manager 2 updated announcement',
          media: [
            {
              url: manager1MediaUrl,
              type: 'image',
            },
          ],
        } as any,
      );

      expect(result).toBeDefined();
      expect(mockOrgService.validateCompanyPublishingAccess).toHaveBeenCalledWith(
        manager2,
        companyOrgId,
      );

      expect(mockPostRepo.update).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          content: 'Manager 2 updated announcement',
          media: expect.arrayContaining([
            expect.objectContaining({
              url: manager1MediaUrl,
              type: 'image',
              size: 512000,
              width: 1920,
              height: 1080,
            }),
          ]),
        }),
      );

      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(
        postId,
        expect.arrayContaining([
          expect.objectContaining({
            postId,
            url: manager1MediaUrl,
          }),
        ]),
      );
    });
  });

  describe('3. Unauthorized User / Unauthorized Manager Rejection', () => {
    it('rejects an unauthorized user attempting to edit a company post', async () => {
      const postId = 'post-company-1';
      const manager1MediaUrl = `${s3Base}/community/uploads/${manager1}/deck-slide.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        media: [{ url: manager1MediaUrl, type: 'image' }],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      await expect(
        postService.updatePost(
          postId,
          unauthorizedUser,
          'student',
          {
            content: 'Tampered content',
            media: [{ url: manager1MediaUrl, type: 'image' }],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.update).not.toHaveBeenCalled();
      expect(mockPostRepo.replaceMedia).not.toHaveBeenCalled();
    });
  });

  describe('4. Rejection of Media Belonging to Another Post', () => {
    it('rejects a manager attempting to attach media from another post uploaded by Manager 1', async () => {
      const postId = 'post-company-1';
      const foreignMediaUrl = `${s3Base}/community/uploads/${manager1}/different-post-confidential.png`;

      // Post 1 only has 'post-1-legit.jpg'
      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post 1',
        media: [
          {
            url: `${s3Base}/community/uploads/${manager1}/post-1-legit.jpg`,
            type: 'image',
          },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      // Manager 2 tries to attach 'different-post-confidential.png' which is NOT attached to post-company-1
      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              {
                url: foreignMediaUrl,
                type: 'image',
              },
            ],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.update).not.toHaveBeenCalled();
      expect(mockPostRepo.replaceMedia).not.toHaveBeenCalled();
    });
  });

  describe('5. Arbitrary S3 Key Injection Rejection', () => {
    it('rejects attempts to inject arbitrary S3 keys or victim media not on the post', async () => {
      const postId = 'post-company-1';
      const arbitraryVictimKey = `${s3Base}/community/uploads/${victimUser}/private-statement.pdf`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        media: [
          {
            url: `${s3Base}/community/uploads/${manager1}/allowed.jpg`,
            type: 'image',
          },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              {
                url: arbitraryVictimKey,
                type: 'document',
              },
            ],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.update).not.toHaveBeenCalled();
      expect(mockPostRepo.replaceMedia).not.toHaveBeenCalled();
    });
  });

  describe('6. New Upload Validation & Ownership Enforcement During Update', () => {
    it('allows Manager 2 to retain Manager 1 media AND add a new upload belonging to Manager 2', async () => {
      const postId = 'post-company-1';
      const retainedUrl = `${s3Base}/community/uploads/${manager1}/slide-1.jpg`;
      const newUploadUrl = `${s3Base}/community/uploads/${manager2}/slide-2.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        type: PostType.IMAGE,
        media: [
          {
            url: retainedUrl,
            type: 'image',
            size: 300000,
          },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...existingPost,
        media: [
          { url: retainedUrl, type: 'image', size: 300000 },
          { url: newUploadUrl, type: 'image', size: 400000 },
        ],
      });

      const result = await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          media: [
            { url: retainedUrl, type: 'image' },
            { url: newUploadUrl, type: 'image', size: 400000 },
          ],
        } as any,
      );

      expect(result).toBeDefined();
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          media: expect.arrayContaining([
            expect.objectContaining({ url: retainedUrl }),
            expect.objectContaining({ url: newUploadUrl }),
          ]),
        }),
      );
    });

    it('rejects adding a new upload belonging to a third user during update', async () => {
      const postId = 'post-company-1';
      const retainedUrl = `${s3Base}/community/uploads/${manager1}/slide-1.jpg`;
      const foreignNewUrl = `${s3Base}/community/uploads/${victimUser}/attack.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        media: [{ url: retainedUrl, type: 'image' }],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              { url: retainedUrl, type: 'image' },
              { url: foreignNewUrl, type: 'image' },
            ],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.update).not.toHaveBeenCalled();
    });

    it('rejects new uploads exceeding size or duration limits', async () => {
      const postId = 'post-company-1';
      const retainedUrl = `${s3Base}/community/uploads/${manager1}/slide-1.jpg`;
      const oversizedUrl = `${s3Base}/community/uploads/${manager2}/huge.png`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        media: [{ url: retainedUrl, type: 'image' }],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      // Photo size > 8MB
      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              {
                url: oversizedUrl,
                type: 'image',
                size: 9 * 1024 * 1024,
              },
            ],
          } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('7. Media Removal & Reordering', () => {
    it('supports removing specific media items and reordering retained media', async () => {
      const postId = 'post-company-1';
      const mediaA = `${s3Base}/community/uploads/${manager1}/photo-a.jpg`;
      const mediaB = `${s3Base}/community/uploads/${manager1}/photo-b.jpg`;
      const mediaC = `${s3Base}/community/uploads/${manager1}/photo-c.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post with 3 images',
        type: PostType.IMAGE,
        media: [
          { url: mediaA, type: 'image', width: 100 },
          { url: mediaB, type: 'image', width: 200 },
          { url: mediaC, type: 'image', width: 300 },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...existingPost,
        media: [
          { url: mediaC, type: 'image', width: 300 },
          { url: mediaA, type: 'image', width: 100 },
        ],
      });

      // Manager 2 reorders [C, A] and omits B
      const result = await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          media: [
            { url: mediaC, type: 'image' },
            { url: mediaA, type: 'image' },
          ],
        } as any,
      );

      expect(result).toBeDefined();
      const updatedMedia = mockPostRepo.update.mock.calls[0][1].media;
      expect(updatedMedia).toHaveLength(2);
      expect(updatedMedia[0].url).toBe(mediaC);
      expect(updatedMedia[0].width).toBe(300);
      expect(updatedMedia[1].url).toBe(mediaA);
      expect(updatedMedia[1].width).toBe(100);

      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(
        postId,
        expect.arrayContaining([
          expect.objectContaining({ url: mediaC }),
          expect.objectContaining({ url: mediaA }),
        ]),
      );
    });

    it('supports clearing all media from a post', async () => {
      const postId = 'post-company-1';
      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post with media',
        type: PostType.IMAGE,
        media: [
          { url: `${s3Base}/community/uploads/${manager1}/photo.jpg`, type: 'image' },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...existingPost,
        type: PostType.TEXT,
        media: [],
      });

      const result = await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          media: [],
        } as any,
      );

      expect(result).toBeDefined();
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          media: [],
          type: PostType.TEXT,
        }),
      );
      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(postId, []);
    });
  });

  describe('8. Personal Posts Protected From Company Manager Edits', () => {
    it('blocks a company manager from editing an unrelated user personal post', async () => {
      const personalPostId = 'post-personal-user-a';
      const existingPersonalPost = {
        _id: personalPostId,
        authorId: userA,
        organizationId: undefined, // Personal post!
        content: 'User A personal thoughts',
        type: PostType.TEXT,
        media: [],
      };

      mockPostRepo.findById.mockResolvedValue(existingPersonalPost);

      // Manager 2 tries to edit User A's personal post
      await expect(
        postService.updatePost(
          personalPostId,
          manager2,
          'student',
          { content: 'Hijacked by company manager' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockOrgService.validateCompanyPublishingAccess).not.toHaveBeenCalled();
      expect(mockPostRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('9. Path Traversal & Security Protection', () => {
    it('rejects path traversal attempts in media URLs', async () => {
      const postId = 'post-company-1';
      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Post',
        media: [],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              {
                url: `${s3Base}/community/uploads/${manager2}/../${manager1}/secret.jpg`,
                type: 'image',
              },
            ],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepo.update).not.toHaveBeenCalled();
    });

    it('rejects null byte injection and dangerous media protocols', async () => {
      const postId = 'post-company-1';
      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Post',
        media: [],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);

      // Null byte
      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              {
                url: `${s3Base}/community/uploads/${manager2}/test.jpg\0.png`,
                type: 'image',
              },
            ],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Javascript protocol
      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            media: [
              {
                url: 'javascript:alert(1)',
                type: 'image',
              },
            ],
          } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('10. Server Metadata Integrity for Retained Media', () => {
    it('guarantees client-supplied metadata cannot overwrite authoritative server metadata for retained media', async () => {
      const postId = 'post-company-video';
      const videoUrl = `${s3Base}/community/uploads/${manager1}/promo.mp4`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Original company promo',
        type: PostType.VIDEO,
        media: [
          {
            url: videoUrl,
            type: 'video',
            size: 50000000,
            mimeType: 'video/mp4',
            duration: 45.5,
            width: 1920,
            height: 1080,
            posterUrl: `${s3Base}/community/posters/${manager1}/poster.jpg`,
            processedUrl: `${s3Base}/community/processed/${manager1}/promo_720p.mp4`,
            mediaId: 'media-job-123',
            audioConfig: { audioMode: 'ORIGINAL_ONLY' },
          },
        ],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue(existingPost);

      // Manager 2 submits retained media with spoofed duration, size, posterUrl, and processedUrl
      await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          media: [
            {
              url: videoUrl,
              type: 'video',
              size: 1, // Spoofed
              duration: 999, // Spoofed
              width: 10, // Spoofed
              height: 10, // Spoofed
              posterUrl: `${s3Base}/community/uploads/${victimUser}/fake-poster.jpg`, // Spoofed
              processedUrl: `${s3Base}/community/uploads/${victimUser}/fake-processed.mp4`, // Spoofed
              mediaId: 'fake-media-id', // Spoofed
              audioConfig: { audioMode: 'MUSIC_ONLY', musicTitle: 'Hacked' }, // Spoofed
            },
          ],
        } as any,
      );

      expect(mockPostRepo.update).toHaveBeenCalledTimes(1);
      const updatedMedia = mockPostRepo.update.mock.calls[0][1].media;
      expect(updatedMedia).toHaveLength(1);

      // Must strictly preserve the server's authoritative metadata
      expect(updatedMedia[0].duration).toBe(45.5);
      expect(updatedMedia[0].size).toBe(50000000);
      expect(updatedMedia[0].width).toBe(1920);
      expect(updatedMedia[0].height).toBe(1080);
      expect(updatedMedia[0].posterUrl).toBe(
        `${s3Base}/community/posters/${manager1}/poster.jpg`,
      );
      expect(updatedMedia[0].processedUrl).toBe(
        `${s3Base}/community/processed/${manager1}/promo_720p.mp4`,
      );
      expect(updatedMedia[0].mediaId).toBe('media-job-123');
      expect(updatedMedia[0].audioConfig).toEqual({
        audioMode: 'ORIGINAL_ONLY',
      });
    });
  });

  describe('11. Duplicate Media Entries Deduplication', () => {
    it('safely deduplicates identical media entries whether submitted with query params or relative paths', async () => {
      const postId = 'post-company-1';
      const mediaUrl = `${s3Base}/community/uploads/${manager1}/slide.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        type: PostType.IMAGE,
        media: [{ url: mediaUrl, type: 'image' }],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue(existingPost);

      // Client passes the same media twice: once with query params, once without
      await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          media: [
            { url: mediaUrl, type: 'image' },
            { url: `${mediaUrl}?X-Amz-Signature=fake123`, type: 'image' },
            { url: `community/uploads/${manager1}/slide.jpg`, type: 'image' },
          ],
        } as any,
      );

      expect(mockPostRepo.update).toHaveBeenCalledTimes(1);
      const updatedMedia = mockPostRepo.update.mock.calls[0][1].media;
      expect(updatedMedia).toHaveLength(1);
      expect(updatedMedia[0].url).toBe(mediaUrl);
    });
  });

  describe('12. Partial Failure Rollback Integrity', () => {
    it('rolls back replaceMedia if post document update fails', async () => {
      const postId = 'post-company-1';
      const existingMediaUrl = `${s3Base}/community/uploads/${manager1}/existing.jpg`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Original',
        media: [{ url: existingMediaUrl, type: 'image' }],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue(existingPost);

      // Simulate update failure after replaceMedia was called
      mockPostRepo.update.mockRejectedValueOnce(
        new Error('Mongo network timeout during post update'),
      );

      await expect(
        postService.updatePost(
          postId,
          manager2,
          'student',
          {
            content: 'Failing update',
            media: [],
          } as any,
        ),
      ).rejects.toThrow('Mongo network timeout during post update');

      // replaceMedia was called first to clear media
      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(postId, []);

      // And then rolled back with pre-edit media!
      expect(mockPostRepo.replaceMedia).toHaveBeenLastCalledWith(
        postId,
        expect.arrayContaining([
          expect.objectContaining({ url: existingMediaUrl, postId }),
        ]),
      );
    });
  });

  describe('13. Legacy Post Media Persistence & Cross-Collection Synchronization', () => {
    it('safely finds and retains media when media exists ONLY on post.media (legacy embedded)', async () => {
      const postId = 'legacy-post-1';
      const legacyUrl = `${s3Base}/community/uploads/${manager1}/legacy.png`;

      const legacyPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Legacy post',
        type: PostType.IMAGE,
        media: [{ url: legacyUrl, type: 'image', size: 12345 }],
      };

      mockPostRepo.findById.mockResolvedValue(legacyPost);
      // findByIdPopulated returns empty external media
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...legacyPost,
        media: [{ url: legacyUrl, type: 'image', size: 12345 }],
      });
      // findMediaByPostId returns empty
      mockPostRepo.findMediaByPostId.mockResolvedValue([]);

      const result = await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          content: 'Updated legacy post',
          media: [{ url: legacyUrl, type: 'image' }],
        } as any,
      );

      expect(result).toBeDefined();
      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(
        postId,
        expect.arrayContaining([
          expect.objectContaining({ url: legacyUrl, postId }),
        ]),
      );
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          media: expect.arrayContaining([
            expect.objectContaining({ url: legacyUrl }),
          ]),
        }),
      );
    });

    it('safely finds and retains media when media exists ONLY in community_post_media', async () => {
      const postId = 'legacy-post-2';
      const separateMediaUrl = `${s3Base}/community/uploads/${manager1}/separate.png`;

      const postWithEmptyEmbedded = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Post with external media only',
        type: PostType.IMAGE,
        media: [], // Empty embedded array
      };

      mockPostRepo.findById.mockResolvedValue(postWithEmptyEmbedded);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...postWithEmptyEmbedded,
        media: [{ url: separateMediaUrl, type: 'image', size: 54321 }],
      });
      mockPostRepo.findMediaByPostId.mockResolvedValue([
        { url: separateMediaUrl, type: 'image', size: 54321 },
      ]);

      const result = await postService.updatePost(
        postId,
        manager2,
        'student',
        {
          media: [{ url: separateMediaUrl, type: 'image' }],
        } as any,
      );

      expect(result).toBeDefined();
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({
          media: expect.arrayContaining([
            expect.objectContaining({ url: separateMediaUrl }),
          ]),
        }),
      );
      expect(mockPostRepo.replaceMedia).toHaveBeenCalledWith(
        postId,
        expect.arrayContaining([
          expect.objectContaining({ url: separateMediaUrl }),
        ]),
      );
    });
  });

  describe('14. Repeated Update Requests Idempotency', () => {
    it('repeated update requests replace records cleanly without duplication', async () => {
      const postId = 'post-company-1';
      const mediaUrl = `${s3Base}/community/uploads/${manager1}/card.png`;

      const existingPost = {
        _id: postId,
        authorId: manager1,
        organizationId: companyOrgId,
        content: 'Company post',
        type: PostType.IMAGE,
        media: [{ url: mediaUrl, type: 'image' }],
      };

      mockPostRepo.findById.mockResolvedValue(existingPost);
      mockPostRepo.findByIdPopulated.mockResolvedValue(existingPost);

      // First update request
      await postService.updatePost(
        postId,
        manager2,
        'student',
        { media: [{ url: mediaUrl, type: 'image' }] } as any,
      );

      // Second identical update request (e.g. double click or retry)
      await postService.updatePost(
        postId,
        manager2,
        'student',
        { media: [{ url: mediaUrl, type: 'image' }] } as any,
      );

      expect(mockPostRepo.replaceMedia).toHaveBeenCalledTimes(2);
      // Each call cleanly replaces media with exactly 1 record
      const call1Payload = mockPostRepo.replaceMedia.mock.calls[0][1];
      const call2Payload = mockPostRepo.replaceMedia.mock.calls[1][1];
      expect(call1Payload).toHaveLength(1);
      expect(call2Payload).toHaveLength(1);
    });
  });
});

