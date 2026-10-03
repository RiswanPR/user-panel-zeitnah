/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostService } from './services/post.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';

describe('Community Phase 3A - Reposts & Quote Posts', () => {
  let postService: PostService;

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
    findActiveRepost: jest.fn(),
    createRepost: jest.fn(),
    removeRepost: jest.fn(),
    adjustRepostCount: jest.fn(),
  };

  const mockGateway = {
    emitPostCreated: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PostRepository, useValue: mockPostRepository },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
  });

  describe('1. Repost Capabilities', () => {
    it('creates a repost referencing the original post and increments repost count', async () => {
      const originalPost = {
        _id: 'post-100',
        authorId: 'author-user-1',
        content: 'Original knowledge post',
        audience: 'public',
        stats: { likes: 5, comments: 2, reposts: 1 },
      };

      const createdRepost = {
        _id: 'repost-200',
        authorId: 'reposting-user-2',
        originalPostId: 'post-100',
        postType: 'repost',
      };

      const populatedCanonical = {
        ...originalPost,
        stats: { ...originalPost.stats, reposts: 2 },
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      mockPostRepository.findActiveRepost.mockResolvedValue(null);
      mockPostRepository.createRepost.mockResolvedValue(createdRepost);
      mockPostRepository.findByIdPopulated.mockResolvedValue(populatedCanonical);

      const result = await postService.repostPost('post-100', 'reposting-user-2');

      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-100');
      expect(mockPostRepository.findActiveRepost).toHaveBeenCalledWith('post-100', 'reposting-user-2');
      expect(mockPostRepository.createRepost).toHaveBeenCalledWith(
        expect.objectContaining({
          originalPostId: 'post-100',
          authorId: 'reposting-user-2',
        }),
      );
      expect(mockPostRepository.adjustRepostCount).toHaveBeenCalledWith('post-100', 1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'author-user-1',
          actorId: 'reposting-user-2',
          type: 'COMMUNITY_REPOST',
          idempotencyKey: 'repost:post-100:reposting-user-2',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.isReposted).toBe(true);
      expect(result.repostsCount).toBe(2);
    });

    it('enforces idempotency: does not duplicate active repost if clicked again', async () => {
      const originalPost = {
        _id: 'post-100',
        authorId: 'author-user-1',
        content: 'Original knowledge post',
        stats: { reposts: 3 },
      };

      const existingRepost = {
        _id: 'repost-existing-1',
        authorId: 'reposting-user-2',
        originalPostId: 'post-100',
        postType: 'repost',
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      mockPostRepository.findActiveRepost.mockResolvedValue(existingRepost);
      mockPostRepository.findByIdPopulated.mockResolvedValue(originalPost);

      const result = await postService.repostPost('post-100', 'reposting-user-2');

      expect(mockPostRepository.createRepost).not.toHaveBeenCalled();
      expect(mockPostRepository.adjustRepostCount).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.isReposted).toBe(true);
      expect(result.message).toBe('Already reposted');
    });

    it('unreposts: removes active repost and decrements reposts count', async () => {
      const targetPost = {
        _id: 'post-100',
        authorId: 'author-user-1',
        stats: { reposts: 3 },
      };

      mockPostRepository.findById.mockResolvedValue(targetPost);
      mockPostRepository.removeRepost.mockResolvedValue(true);
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        ...targetPost,
        stats: { reposts: 2 },
      });

      const result = await postService.unrepostPost('post-100', 'reposting-user-2');

      expect(mockPostRepository.removeRepost).toHaveBeenCalledWith('post-100', 'reposting-user-2');
      expect(mockPostRepository.adjustRepostCount).toHaveBeenCalledWith('post-100', -1);
      expect(result.success).toBe(true);
      expect(result.isReposted).toBe(false);
      expect(result.repostsCount).toBe(2);
    });

    it('rejects reposting when target post is deleted or unavailable', async () => {
      mockPostRepository.findById.mockResolvedValue(null);

      await expect(
        postService.repostPost('nonexistent-post', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not send notification when author reposts their own post', async () => {
      const originalPost = {
        _id: 'post-self',
        authorId: 'user-same',
        stats: { reposts: 0 },
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      mockPostRepository.findActiveRepost.mockResolvedValue(null);
      mockPostRepository.createRepost.mockResolvedValue({ _id: 'repost-self' });
      mockPostRepository.findByIdPopulated.mockResolvedValue(originalPost);

      await postService.repostPost('post-self', 'user-same');

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('2. Quote Post Capabilities', () => {
    it('creates a quote post with commentary and links canonical original post', async () => {
      const originalPost = {
        _id: 'post-original',
        authorId: 'author-jane',
        content: 'Original insightful post',
        audience: 'public',
        stats: { reposts: 1 },
      };

      const createdQuote = {
        _id: 'quote-new',
        authorId: 'user-quoter',
        content: 'This is an important point for global communities.',
        quoteText: 'This is an important point for global communities.',
        postType: 'quote',
        originalPostId: 'post-original',
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      mockPostRepository.create.mockResolvedValue(createdQuote);
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        ...createdQuote,
        originalPost,
      });

      const result = await postService.quotePost('post-original', 'user-quoter', {
        content: 'This is an important point for global communities.',
      });

      expect(mockPostRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: 'user-quoter',
          postType: 'quote',
          originalPostId: 'post-original',
          content: 'This is an important point for global communities.',
        }),
      );
      expect(mockPostRepository.adjustRepostCount).toHaveBeenCalledWith('post-original', 1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'author-jane',
          actorId: 'user-quoter',
          type: 'COMMUNITY_QUOTE',
          idempotencyKey: 'quote:quote-new:user-quoter',
        }),
      );
      expect(mockGateway.emitPostCreated).toHaveBeenCalled();
      expect(result._id).toBe('quote-new');
    });

    it('rejects quote post with empty commentary', async () => {
      const originalPost = {
        _id: 'post-original',
        authorId: 'author-jane',
        content: 'Original insightful post',
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);

      await expect(
        postService.quotePost('post-original', 'user-quoter', { content: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects quote post when target post is deleted', async () => {
      mockPostRepository.findById.mockResolvedValue({
        _id: 'post-deleted',
        isDeleted: true,
      });

      await expect(
        postService.quotePost('post-deleted', 'user-quoter', { content: 'Nice thought' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Nesting Defense & Canonical Resolution', () => {
    it('resolves canonical root when user reposts a repost (A -> B -> C resolves to C reposts A)', async () => {
      const rootOriginalPost = {
        _id: 'post-root-A',
        authorId: 'author-A',
        content: 'Root original post',
        stats: { reposts: 1 },
      };

      const intermediateRepost = {
        _id: 'post-repost-B',
        authorId: 'author-B',
        postType: 'repost',
        originalPostId: 'post-root-A',
      };

      mockPostRepository.findById.mockImplementation((id: string) => {
        if (id === 'post-repost-B') return Promise.resolve(intermediateRepost);
        if (id === 'post-root-A') return Promise.resolve(rootOriginalPost);
        return Promise.resolve(null);
      });

      mockPostRepository.findActiveRepost.mockResolvedValue(null);
      mockPostRepository.createRepost.mockResolvedValue({ _id: 'repost-C' });
      mockPostRepository.findByIdPopulated.mockResolvedValue(rootOriginalPost);

      await postService.repostPost('post-repost-B', 'author-C');

      // Created repost must reference canonical post-root-A, NOT post-repost-B
      expect(mockPostRepository.createRepost).toHaveBeenCalledWith(
        expect.objectContaining({
          originalPostId: 'post-root-A',
          authorId: 'author-C',
        }),
      );
      expect(mockPostRepository.adjustRepostCount).toHaveBeenCalledWith('post-root-A', 1);
    });

    it('resolves canonical root when user quotes a repost', async () => {
      const rootOriginalPost = {
        _id: 'post-root-A',
        authorId: 'author-A',
        content: 'Root original post',
        stats: { reposts: 0 },
      };

      const intermediateRepost = {
        _id: 'post-repost-B',
        authorId: 'author-B',
        postType: 'repost',
        originalPostId: 'post-root-A',
      };

      mockPostRepository.findById.mockImplementation((id: string) => {
        if (id === 'post-repost-B') return Promise.resolve(intermediateRepost);
        if (id === 'post-root-A') return Promise.resolve(rootOriginalPost);
        return Promise.resolve(null);
      });

      mockPostRepository.create.mockResolvedValue({ _id: 'quote-C' });
      mockPostRepository.findByIdPopulated.mockResolvedValue({ _id: 'quote-C' });

      await postService.quotePost('post-repost-B', 'author-C', {
        content: 'Quoting what user B reshared',
      });

      expect(mockPostRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalPostId: 'post-root-A',
          authorId: 'author-C',
          postType: 'quote',
        }),
      );
    });
  });

  describe('4. Deletion & Stats Integrity', () => {
    it('decrements original post stats.reposts when author deletes their repost', async () => {
      const repostDoc = {
        _id: 'repost-to-delete',
        authorId: 'user-reposter',
        postType: 'repost',
        originalPostId: 'post-original-canon',
      };

      mockPostRepository.findById.mockResolvedValue(repostDoc);
      mockPostRepository.softDelete.mockResolvedValue(true);

      const deleted = await postService.deletePost('repost-to-delete', 'user-reposter', 'student');

      expect(mockPostRepository.adjustRepostCount).toHaveBeenCalledWith('post-original-canon', -1);
      expect(mockPostRepository.softDelete).toHaveBeenCalledWith('repost-to-delete');
      expect(deleted).toBe(true);
    });

    it('decrements original post stats.reposts when author deletes their quote post', async () => {
      const quoteDoc = {
        _id: 'quote-to-delete',
        authorId: 'user-quoter',
        postType: 'quote',
        originalPostId: 'post-original-canon',
      };

      mockPostRepository.findById.mockResolvedValue(quoteDoc);
      mockPostRepository.softDelete.mockResolvedValue(true);

      const deleted = await postService.deletePost('quote-to-delete', 'user-quoter', 'student');

      expect(mockPostRepository.adjustRepostCount).toHaveBeenCalledWith('post-original-canon', -1);
      expect(mockPostRepository.softDelete).toHaveBeenCalledWith('quote-to-delete');
      expect(deleted).toBe(true);
    });

    it('forbids deleting another user repost unless admin', async () => {
      const repostDoc = {
        _id: 'repost-123',
        authorId: 'user-A',
        postType: 'repost',
        originalPostId: 'post-orig',
      };

      mockPostRepository.findById.mockResolvedValue(repostDoc);

      await expect(
        postService.deletePost('repost-123', 'user-B', 'student'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Phase 3A.1 Privacy & Authorization Hardening', () => {
    it('prevents reposting a course-restricted post if user is not enrolled', async () => {
      const coursePost = {
        _id: 'post-course-secret',
        authorId: 'instructor-1',
        audience: 'COURSE',
        courseId: 'course-react-101',
        content: 'Restricted course content',
      };

      mockPostRepository.findById.mockResolvedValue(coursePost);

      await expect(
        postService.repostPost('post-course-secret', 'unauthorized-student', ['course-node-201'], 'student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows reposting a course-restricted post if user is enrolled in the course', async () => {
      const coursePost = {
        _id: 'post-course-allowed',
        authorId: 'instructor-1',
        audience: 'COURSE',
        courseId: 'course-react-101',
        content: 'Allowed course content',
        stats: { reposts: 0 },
      };

      mockPostRepository.findById.mockResolvedValue(coursePost);
      mockPostRepository.findActiveRepost.mockResolvedValue(null);
      mockPostRepository.createRepost.mockResolvedValue({ _id: 'repost-allowed' });
      mockPostRepository.findByIdPopulated.mockResolvedValue(coursePost);

      const res = await postService.repostPost(
        'post-course-allowed',
        'enrolled-student',
        ['course-react-101'],
        'student',
      );

      expect(res.success).toBe(true);
      expect(mockPostRepository.createRepost).toHaveBeenCalled();
    });

    it('prevents quoting a course-restricted post if user is not enrolled', async () => {
      const coursePost = {
        _id: 'post-course-secret-quote',
        authorId: 'instructor-1',
        audience: 'COURSE',
        courseId: 'course-python-101',
        content: 'Python restricted material',
      };

      mockPostRepository.findById.mockResolvedValue(coursePost);

      await expect(
        postService.quotePost(
          'post-course-secret-quote',
          'unauthorized-student',
          { content: 'Quoting forbidden material' },
          ['course-react-101'],
          'student',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('handles concurrent race condition gracefully on duplicate key code 11000', async () => {
      const originalPost = {
        _id: 'post-race-test',
        authorId: 'author-1',
        audience: 'public',
        stats: { reposts: 1 },
      };

      const existingRepost = {
        _id: 'repost-winner',
        authorId: 'racer-user',
        originalPostId: 'post-race-test',
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      // First check returns null (both requests started simultaneously)
      mockPostRepository.findActiveRepost.mockResolvedValueOnce(null).mockResolvedValueOnce(existingRepost);

      const mongoDuplicateError: any = new Error('E11000 duplicate key error');
      mongoDuplicateError.code = 11000;
      mockPostRepository.createRepost.mockRejectedValue(mongoDuplicateError);
      mockPostRepository.findByIdPopulated.mockResolvedValue(originalPost);

      const res = await postService.repostPost('post-race-test', 'racer-user');

      expect(res.success).toBe(true);
      expect(res.message).toBe('Already reposted');
      expect(res.isReposted).toBe(true);
    });

    it('Regression Phase 5.6: repostPost safely handles UUID string identifiers and passes normalized audience', async () => {
      const uuidPostId = 'dd10d087-ce9e-4c26-a47d-94cb832dcfd';
      const originalPost = {
        _id: uuidPostId,
        authorId: 'author-uuid-1',
        content: 'Post with UUID identifier',
        audience: 'public',
        stats: { reposts: 3 },
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      mockPostRepository.findActiveRepost.mockResolvedValue(null);
      mockPostRepository.createRepost.mockImplementation(async (data: any) => ({
        _id: 'repost-uuid-new',
        originalPostId: data.originalPostId,
        authorId: data.authorId,
        audience: data.audience,
        type: 'TEXT',
      }));
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        ...originalPost,
        stats: { reposts: 4 },
      });

      const res = await postService.repostPost(uuidPostId, 'user-uuid-actor');

      expect(res.success).toBe(true);
      expect(res.isReposted).toBe(true);
      expect(res.repostsCount).toBe(4);
      expect(mockPostRepository.createRepost).toHaveBeenCalledWith(
        expect.objectContaining({
          originalPostId: uuidPostId,
          authorId: 'user-uuid-actor',
          audience: 'PUBLIC',
        })
      );
    });

    it('Regression Phase 5.6: quotePost ensures uppercase enum type TEXT and uppercase audience', async () => {
      const originalPost = {
        _id: 'post-quote-uuid',
        authorId: 'author-original',
        content: 'Original knowledge post',
        audience: 'public',
        stats: { reposts: 0 },
      };

      mockPostRepository.findById.mockResolvedValue(originalPost);
      mockPostRepository.create.mockImplementation(async (data: any) => ({
        _id: 'quote-post-new',
        ...data,
      }));
      mockPostRepository.findByIdPopulated.mockResolvedValue(originalPost);

      const res = await postService.quotePost('post-quote-uuid', 'quoter-user', {
        content: 'Fascinating engineering design benchmark',
        audience: 'public' as any,
      });

      expect(res).toBeDefined();
      expect(mockPostRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEXT',
          audience: 'PUBLIC',
          postType: 'quote',
          originalPostId: 'post-quote-uuid',
        })
      );
    });
  });
});
