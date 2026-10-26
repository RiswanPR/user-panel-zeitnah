import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ModerationService } from '../moderation/moderation.service';
import { Types } from 'mongoose';

describe('Zeitnah Community — Phase 6: Cross-Feature Quality, Stability & Production Readiness Audit', () => {
  let postService: PostService;
  let commentService: CommentService;
  let mockPostRepo: any;
  let mockCommentRepo: any;
  let mockGateway: any;
  let mockNotificationsService: any;
  let mockOrganizationsService: any;
  let mockModerationService: any;

  const userA = new Types.ObjectId().toString(); // Normal user
  const userB = new Types.ObjectId().toString(); // Blocked user
  const postOwnerId = userA;
  const companyId = new Types.ObjectId().toString();
  const personalPostId = new Types.ObjectId().toString();
  const companyPostId = new Types.ObjectId().toString();
  const deletedPostId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const posts: Record<string, any> = {
      [personalPostId]: {
        _id: personalPostId,
        authorId: userA,
        content: 'Personal design update',
        audience: 'PUBLIC',
        postType: 'original',
        isDeleted: false,
        stats: { likes: 3, comments: 2, reposts: 1 },
      },
      [companyPostId]: {
        _id: companyPostId,
        authorId: userA,
        organizationId: companyId,
        content: 'Official Zeitnah company announcement',
        audience: 'PUBLIC',
        postType: 'original',
        isDeleted: false,
        stats: { likes: 10, comments: 5, reposts: 2 },
      },
      [deletedPostId]: {
        _id: deletedPostId,
        authorId: userA,
        content: 'Old deleted post',
        audience: 'PUBLIC',
        postType: 'original',
        isDeleted: true,
        stats: { likes: 0, comments: 0 },
      },
    };

    mockPostRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        const p = posts[id];
        if (!p || p.isDeleted) return Promise.resolve(null);
        return Promise.resolve(p);
      }),
      findByIdPopulated: jest
        .fn()
        .mockImplementation((id: string, viewerId?: string) => {
          const p = posts[id];
          if (!p || p.isDeleted) return Promise.resolve(null);
          return Promise.resolve({
            ...p,
            author: { _id: p.authorId, name: 'User A' },
            isLikedByMe: false,
            isSaved: false,
          });
        }),
      findFeed: jest.fn().mockImplementation((params: any) => {
        const { excludedUserIds = [], organizationId, filter } = params;
        let items = Object.values(posts).filter((p) => !p.isDeleted);
        if (organizationId) {
          items = items.filter((p) => p.organizationId === organizationId);
        }
        if (excludedUserIds.length > 0) {
          items = items.filter((p) => !excludedUserIds.includes(p.authorId));
        }
        return Promise.resolve({ items, nextCursor: null });
      }),
      searchCommunity: jest.fn().mockImplementation((params: any) => {
        const { excludedUserIds = [] } = params;
        const matchingPosts = Object.values(posts).filter(
          (p) => !p.isDeleted && !excludedUserIds.includes(p.authorId),
        );
        return Promise.resolve({
          posts: matchingPosts,
          people: [],
          topics: [],
        });
      }),
      addReaction: jest
        .fn()
        .mockResolvedValue({ action: 'added', myReactionType: 'like' }),
      removeReaction: jest.fn().mockResolvedValue({ action: 'removed' }),
      findActiveRepost: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data: any) =>
          Promise.resolve({ _id: 'new-id', ...data }),
        ),
      adjustRepostCount: jest.fn().mockResolvedValue(null),
      softDelete: jest.fn().mockImplementation((id: string) => {
        const p = posts[id];
        if (!p || p.isDeleted) return Promise.resolve(false);
        p.isDeleted = true;
        return Promise.resolve(true);
      }),
    };

    mockCommentRepo = {
      findByPostId: jest
        .fn()
        .mockImplementation(
          (
            postId: string,
            limit: number,
            skip: number,
            excludedUserIds: string[] = [],
          ) => {
            return Promise.resolve(
              [
                {
                  _id: 'comment-1',
                  postId,
                  authorId: userA,
                  content: 'Insightful comment',
                },
              ].filter((c) => !excludedUserIds.includes(c.authorId)),
            );
          },
        ),
      create: jest.fn().mockResolvedValue({ _id: 'comment-new' }),
      findById: jest.fn().mockResolvedValue({
        _id: 'comment-1',
        postId: personalPostId,
        authorId: userA,
        isDeleted: false,
      }),
      softDelete: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue({}),
    };

    mockGateway = {
      emitReaction: jest.fn(),
      emitPostUpdated: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ success: true }),
      getPreferences: jest.fn().mockResolvedValue({ inAppNotifications: true }),
    };

    mockOrganizationsService = {
      validateCompanyPublishingAccess: jest
        .fn()
        .mockResolvedValue({ organization: { _id: companyId } }),
      validateCompanyFeedAccess: jest.fn().mockResolvedValue(true),
    };

    mockModerationService = {
      hasBlockRelationship: jest
        .fn()
        .mockImplementation(async (u1: string, u2: string) => {
          return (
            (u1 === userA && u2 === userB) || (u1 === userB && u2 === userA)
          );
        }),
      getExcludedUserIds: jest
        .fn()
        .mockImplementation(async (userId: string) => {
          if (userId === userA) return [userB];
          if (userId === userB) return [userA];
          return [];
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        CommentService,
        { provide: PostRepository, useValue: mockPostRepo },
        { provide: CommentRepository, useValue: mockCommentRepo },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: ModerationService, useValue: mockModerationService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    commentService = module.get<CommentService>(CommentService);
  });

  describe('Audit Scope A: Feed & Search Block Rules Integration', () => {
    it('excludes posts by blocked users in general feed queries', async () => {
      const feed = await postService.getFeed(userB, [], 10);
      expect(mockModerationService.getExcludedUserIds).toHaveBeenCalledWith(
        userB,
      );
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          excludedUserIds: [userA],
        }),
      );
      // Posts by userA should be filtered out for userB
      expect(feed.items.some((p: any) => p.authorId === userA)).toBe(false);
    });

    it('excludes posts by blocked users in searchCommunity queries', async () => {
      const results = await postService.searchCommunity(userB, [], {
        q: 'design',
      });
      expect(mockModerationService.getExcludedUserIds).toHaveBeenCalledWith(
        userB,
      );
      expect(mockPostRepo.searchCommunity).toHaveBeenCalledWith(
        expect.objectContaining({
          excludedUserIds: [userA],
        }),
      );
      expect(results.posts.some((p: any) => p.authorId === userA)).toBe(false);
    });

    it('excludes posts by blocked users in getSavedPosts queries', async () => {
      await postService.getSavedPosts(userB, [], 10);
      expect(mockModerationService.getExcludedUserIds).toHaveBeenCalledWith(
        userB,
      );
      expect(mockPostRepo.findFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'saved',
          excludedUserIds: [userA],
        }),
      );
    });
  });

  describe('Audit Scope B: Blocked-User Interaction & Access Rejection', () => {
    it('blocks a blocked user from reacting to a post by blocker with ForbiddenException', async () => {
      await expect(
        postService.addReaction(personalPostId, userB, 'like'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks a blocked user from reposting a post by blocker with ForbiddenException', async () => {
      await expect(
        postService.repostPost(personalPostId, userB, [], 'student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks a blocked user from quoting a post by blocker with ForbiddenException', async () => {
      await expect(
        postService.quotePost(
          personalPostId,
          userB,
          { content: 'Quoting' },
          [],
          'student',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies blocked user from accessing single post directly with NotFoundException', async () => {
      await expect(
        postService.getPostById(personalPostId, userB),
      ).rejects.toThrow(NotFoundException);
    });

    it('denies accessing soft-deleted post directly via getPostById with NotFoundException', async () => {
      await expect(
        postService.getPostById(deletedPostId, userA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Audit Scope C: Alternate Endpoint Defense in Comments', () => {
    it('rejects retrieving comments on a soft-deleted post with NotFoundException', async () => {
      await expect(
        commentService.getCommentsByPost(deletedPostId, 20, 0, userA),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects retrieving comments on a blocker post with NotFoundException', async () => {
      await expect(
        commentService.getCommentsByPost(personalPostId, 20, 0, userB),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows permitted user to retrieve comments on active post while filtering blocked authors', async () => {
      const comments = await commentService.getCommentsByPost(
        personalPostId,
        20,
        0,
        userA,
      );
      expect(comments).toBeDefined();
      expect(mockCommentRepo.findByPostId).toHaveBeenCalledWith(
        personalPostId,
        20,
        0,
        [userB],
      );
    });
  });
});
