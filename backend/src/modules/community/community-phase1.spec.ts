/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { CommunityS3Service } from './services/community-s3.service';
import { CommunityUploadController } from './controllers/community-upload.controller';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../../common/aws/s3.service';

import { StoryService } from './services/story.service';
import { StoryRepository } from './repositories/mongo-story.repository';

describe('Community Phase 1 - Stability, Security & Core Workflows', () => {
  let postService: PostService;
  let commentService: CommentService;
  let storyService: StoryService;
  let communityS3Service: CommunityS3Service;
  let uploadController: CommunityUploadController;

  const mockPostRepository = {
    create: jest.fn(),
    createMedia: jest.fn(),
    createPoll: jest.fn(),
    findById: jest.fn(),
    findByIdPopulated: jest.fn(),
    findFeed: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    savePost: jest.fn(),
    removeSavedPost: jest.fn(),
  };

  const mockStoryRepository = {
    create: jest.fn(),
    createMedia: jest.fn(),
    findById: jest.fn(),
    findByIdPopulated: jest.fn(),
    getActiveStories: jest.fn(),
    addView: jest.fn(),
    softDelete: jest.fn(),
    deleteExpiredStories: jest.fn(),
  };

  const mockCommentRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdPopulated: jest.fn(),
    findByPostId: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockGateway = {
    emitPostCreated: jest.fn(),
    emitStoryCreated: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockS3Client = {
    send: jest.fn(),
  };

  const mockS3Service = {
    bucketName: 'test-bucket',
    region: 'eu-central-1',
    s3Client: mockS3Client,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunityUploadController],
      providers: [
        PostService,
        CommentService,
        StoryService,
        CommunityS3Service,
        { provide: PostRepository, useValue: mockPostRepository },
        { provide: StoryRepository, useValue: mockStoryRepository },
        { provide: CommentRepository, useValue: mockCommentRepository },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    commentService = module.get<CommentService>(CommentService);
    storyService = module.get<StoryService>(StoryService);
    communityS3Service = module.get<CommunityS3Service>(CommunityS3Service);
    uploadController = module.get<CommunityUploadController>(CommunityUploadController);
  });

  describe('Post Creation & Author Population', () => {
    it('creates a post and immediately returns populated author and media without page refresh', async () => {
      const userId = 'user-123';
      const createdRaw = { _id: 'post-1', authorId: userId };
      const populatedPost = {
        _id: 'post-1',
        authorId: userId,
        content: 'Hello Zeitnah community!',
        author: {
          id: userId,
          name: 'Jane Doe',
          displayName: 'Jane Doe',
          username: 'janedoe',
          avatar: 'https://example.com/avatar.jpg',
        },
        media: [{ url: 'https://example.com/image.jpg', type: 'image' }],
        stats: { likes: 0, comments: 0 },
        isLikedByMe: false,
      };

      mockPostRepository.create.mockResolvedValue(createdRaw);
      mockPostRepository.findByIdPopulated.mockResolvedValue(populatedPost);

      const result = await postService.createPost(userId, {
        content: 'Hello Zeitnah community!',
        type: 'IMAGE',
        media: [{ url: 'https://example.com/image.jpg', type: 'image' }],
      } as any);

      expect(mockPostRepository.create).toHaveBeenCalled();
      expect(mockPostRepository.createMedia).toHaveBeenCalled();
      expect(mockPostRepository.findByIdPopulated).toHaveBeenCalledWith('post-1', userId);
      expect(result).toEqual(populatedPost);
      expect(result.author.username).toBe('janedoe');
    });
  });

  describe('Post Authorization & Ownership Enforcement', () => {
    it('allows author to delete their own post', async () => {
      mockPostRepository.findById.mockResolvedValue({ _id: 'post-1', authorId: 'user-1' });
      mockPostRepository.softDelete.mockResolvedValue(true);

      const success = await postService.deletePost('post-1', 'user-1', 'student');
      expect(success).toBe(true);
      expect(mockPostRepository.softDelete).toHaveBeenCalledWith('post-1');
    });

    it('allows admin to delete another user post', async () => {
      mockPostRepository.findById.mockResolvedValue({ _id: 'post-1', authorId: 'user-1' });
      mockPostRepository.softDelete.mockResolvedValue(true);

      const success = await postService.deletePost('post-1', 'admin-99', 'admin');
      expect(success).toBe(true);
    });

    it('rejects another student from deleting post (ForbiddenException)', async () => {
      mockPostRepository.findById.mockResolvedValue({ _id: 'post-1', authorId: 'user-1' });

      await expect(
        postService.deletePost('post-1', 'attacker-user-2', 'student')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Reactions & Notification Integration', () => {
    it('notifies post author when another user adds a reaction', async () => {
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'added',
        isLikedByMe: true,
        myReactionType: 'like',
        stats: { likes: 1 },
      });
      mockPostRepository.findById.mockResolvedValue({ _id: 'post-1', authorId: 'author-user-1' });

      await postService.addReaction('post-1', 'reactor-user-2', 'like');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'author-user-1',
          actorId: 'reactor-user-2',
          type: 'COMMUNITY_REACTION',
        })
      );
    });

    it('never notifies author when author reacts to their own post (self-action)', async () => {
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'added',
        isLikedByMe: true,
        myReactionType: 'like',
        stats: { likes: 1 },
      });
      mockPostRepository.findById.mockResolvedValue({ _id: 'post-1', authorId: 'author-user-1' });

      await postService.addReaction('post-1', 'author-user-1', 'like');

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('Comment Operations & Author Resolution', () => {
    it('creates comment and returns populated author data immediately', async () => {
      mockPostRepository.findById.mockResolvedValue({ _id: 'post-1', authorId: 'author-1' });
      mockCommentRepository.create.mockResolvedValue({ _id: 'comment-1' });
      const populatedComment = {
        _id: 'comment-1',
        postId: 'post-1',
        content: 'Great post!',
        author: {
          id: 'commenter-2',
          name: 'Bob Smith',
          username: 'bobsmith',
          avatar: 'https://example.com/bob.jpg',
        },
      };
      mockCommentRepository.findByIdPopulated.mockResolvedValue(populatedComment);

      const result = await commentService.createComment('commenter-2', 'post-1', {
        content: 'Great post!',
      });

      expect(result).toEqual(populatedComment);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'author-1',
          actorId: 'commenter-2',
          type: 'COMMUNITY_COMMENT',
        })
      );
    });

    it('prevents another user from deleting a comment they do not own', async () => {
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-1',
        authorId: 'user-owner',
      });

      await expect(
        commentService.deleteComment('comment-1', 'attacker-user', 'student')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('S3 / Media IDOR Protection', () => {
    it('allows user to delete their own media under community/uploads/<userId>/', async () => {
      mockS3Client.send.mockResolvedValue({});
      const userFileUrl =
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/test-image.jpg';

      await expect(
        communityS3Service.deleteCommunityMedia(userFileUrl, 'user-123', false)
      ).resolves.not.toThrow();

      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('blocks user from deleting another user media (IDOR violation)', async () => {
      const victimFileUrl =
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/victim-456/private-doc.pdf';

      await expect(
        communityS3Service.deleteCommunityMedia(victimFileUrl, 'attacker-user-123', false)
      ).rejects.toThrow(ForbiddenException);

      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('blocks path traversal attempts in media deletion', async () => {
      const traversalUrl =
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/../../system-config.json';

      await expect(
        communityS3Service.deleteCommunityMedia(traversalUrl, 'user-123', false)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Phase 4.2: Upload Limits & Magic Bytes Verification', () => {
    const validReq = { user: { userId: 'user-123', role: 'student' } };

    it('rejects image files exceeding 8 MiB with PayloadTooLargeException (413)', async () => {
      const oversizedImage = {
        fieldname: 'file',
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 8 * 1024 * 1024 + 1,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      } as any;

      await expect(
        uploadController.uploadFile(oversizedImage, validReq),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('rejects video files exceeding 1 GiB with PayloadTooLargeException (413)', async () => {
      const oversizedVideo = {
        fieldname: 'file',
        originalname: 'large.mp4',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 1024 + 1,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      await expect(
        uploadController.uploadFile(oversizedVideo, validReq),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('rejects video files exceeding 90 seconds duration with BadRequestException (400)', async () => {
      const longVideo = {
        fieldname: 'file',
        originalname: 'long.mp4',
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      jest.spyOn(communityS3Service, 'getVideoDuration').mockResolvedValue(91);

      await expect(
        uploadController.uploadFile(longVideo, validReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects malicious renamed files failing magic bytes check', async () => {
      const fakePng = {
        fieldname: 'file',
        originalname: 'malicious.exe.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // Windows MZ executable signature
      } as any;

      await expect(
        uploadController.uploadFile(fakePng, validReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts genuine PNG files with valid magic bytes within limits', async () => {
      mockS3Client.send.mockResolvedValue({});
      const genuinePng = {
        fieldname: 'file',
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as any;

      const res = await uploadController.uploadFile(genuinePng, validReq);
      expect(res).toBeDefined();
      expect(res.url).toContain('community/uploads/user-123/');
      expect(res.mimeType).toBe('image/png');
    });
  });

  describe('Phase 4.3: Authoritative Media Ownership & S3 Path Security', () => {
    const userA = 'user-A';
    const userB = 'user-B';

    it('rejects post creation when User B attempts to attach User A S3 media object', async () => {
      const foreignMediaUrl = 'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-A/private.jpg';

      await expect(
        postService.createPost(userB, {
          content: 'Hijacked post',
          media: [{ url: foreignMediaUrl, type: 'image' }],
        } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPostRepository.create).not.toHaveBeenCalled();
    });

    it('rejects story creation when User B attempts to attach User A S3 media object', async () => {
      const foreignMediaUrl = 'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-A/story.jpg';

      await expect(
        storyService.createStory(userB, {
          type: 'image',
          mediaUrl: foreignMediaUrl,
        } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockStoryRepository.create).not.toHaveBeenCalled();
    });

    it('rejects path traversal attempts in media URLs', async () => {
      const traversalUrls = [
        '../secret.jpg',
        '..\\secret.jpg',
        'community/uploads/user-123/../../etc/passwd',
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/%2e%2e/admin.jpg',
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/%252e%252e/admin.jpg',
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/%5c..%5croot.jpg',
      ];

      for (const url of traversalUrls) {
        await expect(
          postService.createPost('user-123', {
            content: 'Traversal attempt',
            media: [{ url, type: 'image' }],
          } as any),
        ).rejects.toThrow(ForbiddenException);
      }
    });

    it('rejects foreign S3 bucket URLs outside the authorized bucket', async () => {
      const foreignBucketUrl = 'https://attacker-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/pic.jpg';

      await expect(
        postService.createPost('user-123', {
          content: 'Foreign bucket test',
          media: [{ url: foreignBucketUrl, type: 'image' }],
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects root access and empty keys on S3 storage', async () => {
      await expect(
        postService.createPost('user-123', {
          content: 'Root access test',
          media: [{ url: 'https://test-bucket.s3.eu-central-1.amazonaws.com/', type: 'image' }],
        } as any),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        postService.createPost('user-123', {
          content: 'Empty URL test',
          media: [{ url: '   ', type: 'image' }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts genuine user S3 media and strips ephemeral query params before storage', async () => {
      const userMediaWithSignature =
        'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/my-photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123';

      mockPostRepository.create.mockResolvedValue({ _id: 'post-new-1', authorId: 'user-123' });
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: 'post-new-1',
        authorId: 'user-123',
        content: 'Valid user post',
        media: [{ url: 'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/my-photo.jpg', type: 'image' }],
      });

      const result = await postService.createPost('user-123', {
        content: 'Valid user post',
        media: [{ url: userMediaWithSignature, type: 'image' }],
      } as any);

      expect(result).toBeDefined();
      expect(mockPostRepository.createMedia).toHaveBeenCalledWith([
        expect.objectContaining({
          url: 'https://test-bucket.s3.eu-central-1.amazonaws.com/community/uploads/user-123/my-photo.jpg',
        }),
      ]);
    });
  });

  describe('Phase 4.3: Authoritative Post Limits & Deduplication', () => {
    it('rejects posts with more than 10 media items', async () => {
      const elevenItems = Array.from({ length: 11 }, (_, i) => ({
        url: `https://example.com/image${i}.jpg`,
        type: 'image',
      }));

      await expect(
        postService.createPost('user-123', {
          content: 'Too many items',
          media: elevenItems,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects media items with invalid type', async () => {
      await expect(
        postService.createPost('user-123', {
          content: 'Invalid type',
          media: [{ url: 'https://example.com/audio.mp3', type: 'audio' }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects oversized image in post media if size specified exceeds 8 MiB', async () => {
      await expect(
        postService.createPost('user-123', {
          content: 'Oversized',
          media: [{ url: 'https://example.com/image.jpg', type: 'image', size: 8 * 1024 * 1024 + 1 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects oversized video in post media if size specified exceeds 1 GiB', async () => {
      await expect(
        postService.createPost('user-123', {
          content: 'Oversized video',
          media: [{ url: 'https://example.com/video.mp4', type: 'video', size: 1024 * 1024 * 1024 + 1 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects video in post media if duration exceeds 90 seconds', async () => {
      await expect(
        postService.createPost('user-123', {
          content: 'Long video',
          media: [{ url: 'https://example.com/video.mp4', type: 'video', duration: 91 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deduplicates identical media URLs in the same post', async () => {
      mockPostRepository.create.mockResolvedValue({ _id: 'post-dup', authorId: 'user-123' });
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: 'post-dup',
        media: [{ url: 'https://example.com/same.jpg', type: 'image' }],
      });

      await postService.createPost('user-123', {
        content: 'Duplicate items',
        media: [
          { url: 'https://example.com/same.jpg', type: 'image' },
          { url: 'https://example.com/same.jpg', type: 'image' },
        ],
      } as any);

      expect(mockPostRepository.createMedia).toHaveBeenCalledWith([
        expect.objectContaining({ url: 'https://example.com/same.jpg' }),
      ]);
    });
  });

  describe('Phase 4.3: MIME & Extension Consistency', () => {
    const validReq = { user: { userId: 'user-123' } };

    it('rejects upload where file extension does not match MIME type', async () => {
      const mismatchedFile = {
        fieldname: 'file',
        originalname: 'photo.png',
        mimetype: 'video/mp4',
        size: 1024,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      await expect(uploadController.uploadFile(mismatchedFile, validReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects upload with dangerous executable extension despite innocent MIME', async () => {
      const scriptFile = {
        fieldname: 'file',
        originalname: 'exploit.php',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      } as any;

      await expect(uploadController.uploadFile(scriptFile, validReq)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Phase 4.3: Rapid Publish & Duplicate Post Protection', () => {
    it('executes exactly one creation when multiple identical requests arrive concurrently', async () => {
      const userId = 'user-rapid';
      let callCount = 0;
      mockPostRepository.create.mockImplementation(async (data) => {
        callCount++;
        // simulate slight async latency
        await new Promise((r) => setTimeout(r, 20));
        return { _id: 'rapid-post-1', ...data };
      });
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: 'rapid-post-1',
        authorId: userId,
        content: 'Rapid fire post',
      });

      const postPayload = {
        content: 'Rapid fire post',
        media: [{ url: 'https://example.com/img.jpg', type: 'image' }],
      } as any;

      // 5 concurrent rapid clicks
      const promises = [
        postService.createPost(userId, postPayload),
        postService.createPost(userId, postPayload),
        postService.createPost(userId, postPayload),
        postService.createPost(userId, postPayload),
        postService.createPost(userId, postPayload),
      ];

      const results = await Promise.all(promises);

      // Exactly 1 database record created
      expect(callCount).toBe(1);
      expect(mockPostRepository.create).toHaveBeenCalledTimes(1);

      // All 5 callers receive the same populated post
      for (const res of results) {
        expect(res._id).toBe('rapid-post-1');
      }
    });
  });
});
