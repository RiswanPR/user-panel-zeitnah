import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './controllers/post.controller';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunityGateway } from './gateways/community.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('Phase 4: Community Feed & Creator Experience 2.0', () => {
  let postController: PostController;
  let postService: PostService;
  let commentService: CommentService;
  let mockPostRepository: any;
  let mockCommentRepository: any;
  let mockNotificationsService: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockPostRepository = {
      findFeed: jest.fn(),
      findById: jest.fn(),
      findByIdPopulated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
      savePost: jest.fn(),
      removeSavedPost: jest.fn(),
      updateStats: jest.fn(),
      getCreatorInsights: jest.fn(),
      searchCommunity: jest.fn(),
    };

    mockCommentRepository = {
      create: jest.fn(),
      findByIdPopulated: jest.fn(),
      countByPost: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ success: true }),
    };

    mockGateway = {
      server: { emit: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        PostService,
        CommentService,
        { provide: PostRepository, useValue: mockPostRepository },
        { provide: CommentRepository, useValue: mockCommentRepository },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CommunityGateway, useValue: mockGateway },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    postController = module.get<PostController>(PostController);
    postService = module.get<PostService>(PostService);
    commentService = module.get<CommentService>(CommentService);
  });

  describe('Reels Discovery & Trending Pipeline', () => {
    it('passes reels_trending filter down to postRepository.findFeed', async () => {
      mockPostRepository.findFeed.mockResolvedValue({
        items: [
          {
            _id: 'reel-1',
            type: 'VIDEO',
            content: 'Trending coding setup',
            stats: { likes: 50, views: 1200 },
          },
        ],
        nextCursor: null,
      });

      const result = await postService.getFeed(
        'user-1',
        [],
        10,
        undefined,
        'reels_trending',
      );

      expect(mockPostRepository.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          filter: 'reels_trending',
          limit: 10,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]._id).toBe('reel-1');
    });
  });

  describe('Creator Insights Foundation (Phase 14)', () => {
    it('postController.getCreatorInsights extracts userId and calls postService', async () => {
      const mockInsights = {
        overview: {
          totalPosts: 12,
          totalReels: 4,
          totalViews: 3500,
          totalLikes: 240,
          totalComments: 45,
          totalShares: 18,
          totalReposts: 8,
          totalFollowers: 95,
        },
        topPosts: [
          {
            _id: 'post-top-1',
            content: 'Architecture best practices',
            stats: { views: 1500, likes: 120 },
          },
        ],
      };

      mockPostRepository.getCreatorInsights.mockResolvedValue(mockInsights);

      const req = { user: { userId: 'creator-123' } };
      const response = await postController.getCreatorInsights(req);

      expect(mockPostRepository.getCreatorInsights).toHaveBeenCalledWith(
        'creator-123',
      );
      expect(response).toEqual(mockInsights);
      expect(response.overview.totalViews).toBe(3500);
      expect(response.overview.totalFollowers).toBe(95);
    });

    it('returns empty overview when creator has no posts', async () => {
      mockPostRepository.getCreatorInsights.mockResolvedValue({
        overview: {
          totalPosts: 0,
          totalReels: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalReposts: 0,
          totalFollowers: 0,
        },
        topPosts: [],
      });

      const insights = await postService.getCreatorInsights('new-creator-999');
      expect(insights.overview.totalPosts).toBe(0);
      expect(insights.topPosts).toEqual([]);
    });
  });

  describe('Deep-link Notification Integration (Phase 13)', () => {
    it('creates deep-linked notification for video reel reaction (/community/reels/:id)', async () => {
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'added',
        isLikedByMe: true,
        myReactionType: 'like',
        stats: { likes: 5 },
      });

      mockPostRepository.findById.mockResolvedValue({
        _id: 'reel-99',
        authorId: 'creator-456',
        type: 'VIDEO',
        media: [{ type: 'video', url: 'https://s3.amazonaws.com/reel-99.mp4' }],
      });

      await postService.addReaction('reel-99', 'viewer-789', 'like');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'creator-456',
          actorId: 'viewer-789',
          type: 'COMMUNITY_REACTION',
          actionUrl: '/community/reels/reel-99',
          targetUrl: '/community/reels/reel-99',
        }),
      );
    });

    it('creates deep-linked notification for standard feed post reaction (/community#:id)', async () => {
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'added',
        isLikedByMe: true,
        myReactionType: 'like',
        stats: { likes: 10 },
      });

      mockPostRepository.findById.mockResolvedValue({
        _id: 'post-101',
        authorId: 'author-888',
        type: 'TEXT',
        media: [],
      });

      await postService.addReaction('post-101', 'reader-222', 'like');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'author-888',
          actorId: 'reader-222',
          type: 'COMMUNITY_REACTION',
          actionUrl: '/community#post-101',
          targetUrl: '/community#post-101',
        }),
      );
    });

    it('creates deep-linked notification for comment on video reel', async () => {
      mockPostRepository.findById.mockResolvedValue({
        _id: 'reel-video-1',
        authorId: 'creator-author',
        type: 'VIDEO',
      });

      mockCommentRepository.create.mockResolvedValue({
        _id: 'comment-1',
        postId: 'reel-video-1',
        authorId: 'commenter-user',
        content: 'Awesome reel!',
      });

      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'comment-1',
        postId: 'reel-video-1',
        authorId: 'commenter-user',
        content: 'Awesome reel!',
      });

      await commentService.createComment('commenter-user', 'reel-video-1', {
        content: 'Awesome reel!',
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'creator-author',
          actorId: 'commenter-user',
          type: 'COMMUNITY_COMMENT',
          actionUrl: '/community/reels/reel-video-1',
          targetUrl: '/community/reels/reel-video-1',
        }),
      );
    });
  });

  describe('Comment & Post Authorization Regression (ObjectId & String Identity)', () => {
    it('allows comment author to delete comment when authorId is an ObjectId', async () => {
      const authorObjectId = new Types.ObjectId();
      const commentId = new Types.ObjectId().toString();
      mockCommentRepository.findById.mockResolvedValue({
        _id: commentId,
        authorId: authorObjectId,
        postId: 'post-1',
      });
      mockCommentRepository.softDelete.mockResolvedValue(true);
      mockPostRepository.update.mockResolvedValue(true);

      const result = await commentService.deleteComment(
        commentId,
        authorObjectId.toString(),
        'user',
      );
      expect(result).toBe(true);
    });

    it('blocks non-author from deleting comment', async () => {
      const commentId = new Types.ObjectId().toString();
      mockCommentRepository.findById.mockResolvedValue({
        _id: commentId,
        authorId: 'author-123',
        postId: 'post-1',
      });

      await expect(
        commentService.deleteComment(commentId, 'intruder-456', 'user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows post author to update post when authorId is an ObjectId', async () => {
      const authorObjectId = new Types.ObjectId();
      const postId = new Types.ObjectId().toString();
      mockPostRepository.findById.mockResolvedValue({
        _id: postId,
        authorId: authorObjectId,
      });
      mockPostRepository.update.mockResolvedValue(true);
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: postId,
        authorId: authorObjectId,
        content: 'Updated content',
      });

      const result = await postService.updatePost(
        postId,
        authorObjectId.toString(),
        'user',
        { content: 'Updated content' } as any,
      );
      expect(result).toBeDefined();
      expect(result.content).toBe('Updated content');
    });

    it('blocks non-author from editing post', async () => {
      const postId = new Types.ObjectId().toString();
      mockPostRepository.findById.mockResolvedValue({
        _id: postId,
        authorId: 'author-123',
      });

      await expect(
        postService.updatePost(
          postId,
          'intruder-456',
          'user',
          { content: 'Hacked' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
