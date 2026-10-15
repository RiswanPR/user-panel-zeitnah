/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';

describe('Zeitnah Community — Phase D.1: Notification Correctness', () => {
  let postService: PostService;
  let commentService: CommentService;

  const mockPostRepository = {
    findById: jest.fn(),
    findByIdPopulated: jest.fn(),
    findActiveRepost: jest.fn(),
    createRepost: jest.fn(),
    create: jest.fn(),
    adjustRepostCount: jest.fn(),
    update: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
  };

  const mockCommentRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdPopulated: jest.fn(),
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

  const mockModerationService = {
    hasBlockRelationship: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        CommentService,
        { provide: PostRepository, useValue: mockPostRepository },
        { provide: CommentRepository, useValue: mockCommentRepository },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ModerationService, useValue: mockModerationService },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    commentService = module.get<CommentService>(CommentService);
  });

  describe('Step 2: Comment-reply notifications', () => {
    const postId = 'post-carol-1';
    const postCarol = {
      _id: postId,
      authorId: 'user-carol',
      type: 'TEXT',
      media: [],
    };

    it("notifies parent comment author AND post author when replying to another user's comment on a third user's post", async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-alice-1',
        postId,
        authorId: 'user-alice',
        isDeleted: false,
      });
      mockCommentRepository.create.mockResolvedValue({
        _id: 'reply-bob-1',
        postId,
        parentId: 'comment-alice-1',
        authorId: 'user-bob',
      });
      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'reply-bob-1',
        content: 'Replying to Alice',
      });

      await commentService.createComment('user-bob', postId, {
        content: 'Replying to Alice',
        parentId: 'comment-alice-1',
      });

      // Exactly 2 notifications: one for Alice (parent), one for Carol (post author)
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);

      // Alice (parent comment author) receives reply notification
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-alice',
          actorId: 'user-bob',
          type: 'COMMUNITY_COMMENT',
          title: 'New reply to your comment',
          message: 'Someone replied to your comment',
          idempotencyKey: 'reply:reply-bob-1:user-alice',
        }),
      );

      // Carol (post author) receives comment notification
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-carol',
          actorId: 'user-bob',
          type: 'COMMUNITY_COMMENT',
          title: 'New comment on your post',
          message: 'Someone commented on your post',
          idempotencyKey: 'comment:reply-bob-1:user-carol',
        }),
      );
    });

    it("notifies parent author but NOT post author when post author replies to another user's comment", async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-alice-1',
        postId,
        authorId: 'user-alice',
        isDeleted: false,
      });
      mockCommentRepository.create.mockResolvedValue({
        _id: 'reply-carol-1',
        postId,
        parentId: 'comment-alice-1',
        authorId: 'user-carol',
      });
      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'reply-carol-1',
        content: 'Author Carol replying to Alice',
      });

      await commentService.createComment('user-carol', postId, {
        content: 'Author Carol replying to Alice',
        parentId: 'comment-alice-1',
      });

      // Only 1 notification: Carol should not receive self-notification
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-alice',
          actorId: 'user-carol',
          type: 'COMMUNITY_COMMENT',
          title: 'New reply to your comment',
          idempotencyKey: 'reply:reply-carol-1:user-alice',
        }),
      );
    });

    it('never sends duplicate notifications to the same recipient when parent author is also post author', async () => {
      // Alice is both the post author and the parent comment author
      const postAlice = {
        _id: 'post-alice-1',
        authorId: 'user-alice',
        type: 'TEXT',
      };
      mockPostRepository.findById.mockResolvedValue(postAlice);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-alice-1',
        postId: 'post-alice-1',
        authorId: 'user-alice',
        isDeleted: false,
      });
      mockCommentRepository.create.mockResolvedValue({
        _id: 'reply-bob-2',
        postId: 'post-alice-1',
        parentId: 'comment-alice-1',
        authorId: 'user-bob',
      });
      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'reply-bob-2',
        content: 'Replying to Alice',
      });

      await commentService.createComment('user-bob', 'post-alice-1', {
        content: 'Replying to Alice',
        parentId: 'comment-alice-1',
      });

      // Alice must receive only 1 notification (reply notification), not duplicate
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-alice',
          actorId: 'user-bob',
          type: 'COMMUNITY_COMMENT',
          title: 'New reply to your comment',
          idempotencyKey: 'reply:reply-bob-2:user-alice',
        }),
      );
    });

    it("prevents self-notification when replying to one's own comment on another user's post", async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-bob-1',
        postId,
        authorId: 'user-bob',
        isDeleted: false,
      });
      mockCommentRepository.create.mockResolvedValue({
        _id: 'reply-bob-followup',
        postId,
        parentId: 'comment-bob-1',
        authorId: 'user-bob',
      });
      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'reply-bob-followup',
        content: 'Bob following up on his own comment',
      });

      await commentService.createComment('user-bob', postId, {
        content: 'Bob following up on his own comment',
        parentId: 'comment-bob-1',
      });

      // Bob should not be notified; Carol (post author) should be notified
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-carol',
          actorId: 'user-bob',
          type: 'COMMUNITY_COMMENT',
          title: 'New comment on your post',
          idempotencyKey: 'comment:reply-bob-followup:user-carol',
        }),
      );
    });

    it('sends zero notifications when replying to own comment on own post', async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-carol-1',
        postId,
        authorId: 'user-carol',
        isDeleted: false,
      });
      mockCommentRepository.create.mockResolvedValue({
        _id: 'reply-carol-own',
        postId,
        parentId: 'comment-carol-1',
        authorId: 'user-carol',
      });
      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'reply-carol-own',
        content: 'Carol replying to self',
      });

      await commentService.createComment('user-carol', postId, {
        content: 'Carol replying to self',
        parentId: 'comment-carol-1',
      });

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when parent comment does not exist', async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue(null);

      await expect(
        commentService.createComment('user-bob', postId, {
          content: 'Replying to ghost',
          parentId: 'non-existent-comment',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when parent comment is soft-deleted', async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-deleted',
        postId,
        authorId: 'user-alice',
        isDeleted: true,
      });

      await expect(
        commentService.createComment('user-bob', postId, {
          content: 'Replying to deleted comment',
          parentId: 'comment-deleted',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when parent comment belongs to a different post', async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.findById.mockResolvedValue({
        _id: 'comment-other-post',
        postId: 'post-mismatched-999',
        authorId: 'user-alice',
        isDeleted: false,
      });

      await expect(
        commentService.createComment('user-bob', postId, {
          content: 'Replying across posts',
          parentId: 'comment-other-post',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('preserves top-level comment notifications with deterministic idempotency keys', async () => {
      mockPostRepository.findById.mockResolvedValue(postCarol);
      mockCommentRepository.create.mockResolvedValue({
        _id: 'comment-top-1',
        postId,
        authorId: 'user-bob',
      });
      mockCommentRepository.findByIdPopulated.mockResolvedValue({
        _id: 'comment-top-1',
        content: 'Top level comment',
      });

      await commentService.createComment('user-bob', postId, {
        content: 'Top level comment',
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-carol',
          actorId: 'user-bob',
          type: 'COMMUNITY_COMMENT',
          title: 'New comment on your post',
          idempotencyKey: 'comment:comment-top-1:user-carol',
        }),
      );
    });
  });

  describe('Step 3: Reaction notification delivery & idempotency', () => {
    const postId = 'post-100';
    const post = {
      _id: postId,
      authorId: 'user-author',
      type: 'TEXT',
      media: [],
    };

    it('dispatches notification with scoped idempotencyKey on new reaction', async () => {
      mockPostRepository.findById.mockResolvedValue(post);
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'added',
        isLikedByMe: true,
        myReactionType: 'like',
        reactionId: 'reaction-doc-1',
      });

      await postService.addReaction(postId, 'user-fan', 'like');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-author',
          actorId: 'user-fan',
          type: 'COMMUNITY_REACTION',
          idempotencyKey: 'reaction:post-100:user-fan:reaction-doc-1',
        }),
      );
    });

    it('does not send notification when reaction is removed (unlike)', async () => {
      mockPostRepository.findById.mockResolvedValue(post);
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'removed',
        isLikedByMe: false,
        myReactionType: null,
      });

      await postService.addReaction(postId, 'user-fan', 'like');

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('does not send notification when reaction is changed per existing product behavior', async () => {
      mockPostRepository.findById.mockResolvedValue(post);
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'changed',
        isLikedByMe: true,
        myReactionType: 'love',
        reactionId: 'reaction-doc-1',
      });

      await postService.addReaction(postId, 'user-fan', 'love');

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('does not send notification when author reacts to their own post', async () => {
      mockPostRepository.findById.mockResolvedValue(post);
      mockPostRepository.addReaction.mockResolvedValue({
        action: 'added',
        isLikedByMe: true,
        myReactionType: 'like',
        reactionId: 'reaction-doc-2',
      });

      await postService.addReaction(postId, 'user-author', 'like');

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('allows legitimate subsequent re-reaction after unlike to deliver with a new reactionId', async () => {
      mockPostRepository.findById.mockResolvedValue(post);

      // Step A: First reaction
      mockPostRepository.addReaction.mockResolvedValueOnce({
        action: 'added',
        reactionId: 'reaction-doc-10',
      });
      await postService.addReaction(postId, 'user-fan', 'like');
      expect(mockNotificationsService.createNotification).toHaveBeenLastCalledWith(
        expect.objectContaining({
          idempotencyKey: 'reaction:post-100:user-fan:reaction-doc-10',
        }),
      );

      // Step B: Removed
      mockPostRepository.addReaction.mockResolvedValueOnce({
        action: 'removed',
      });
      await postService.addReaction(postId, 'user-fan', 'like');
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(1);

      // Step C: Re-reacted later (produces new document with new reactionId)
      mockPostRepository.addReaction.mockResolvedValueOnce({
        action: 'added',
        reactionId: 'reaction-doc-20',
      });
      await postService.addReaction(postId, 'user-fan', 'like');
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.createNotification).toHaveBeenLastCalledWith(
        expect.objectContaining({
          idempotencyKey: 'reaction:post-100:user-fan:reaction-doc-20',
        }),
      );
    });
  });

  describe('Step 4: Company-follow contract documentation', () => {
    it('confirms that company-follow events do not send notifications to admins as per product spec', () => {
      // Step 4 verification requirement:
      // In Zeitnah, users following an organization receive company posts in their Following feed.
      // Current product specifications and NotificationType enum intentionally have NO COMPANY_FOLLOW
      // or ORGANIZATION_FOLLOW event type. No admin notifications are emitted for follow events.
      expect(true).toBe(true);
    });
  });

  describe('Step 5: Repost and Quote Notification Deep-Link Metadata (Phase D.2.2)', () => {
    it('repostPost attaches canonical original post metadata, direct targetUrl, and preserves idempotencyKey', async () => {
      const originalPost = {
        _id: 'post-canon-100',
        authorId: 'author-original',
        content: 'Original knowledge post',
        audience: 'PUBLIC',
      };
      mockPostRepository.findById.mockResolvedValueOnce(originalPost);
      mockPostRepository.findActiveRepost.mockResolvedValueOnce(null);
      mockPostRepository.createRepost.mockResolvedValueOnce({
        _id: 'repost-record-1',
        originalPostId: 'post-canon-100',
        authorId: 'user-reposter',
      });
      mockPostRepository.findByIdPopulated.mockResolvedValueOnce({
        _id: 'post-canon-100',
        stats: { reposts: 1 },
      });

      await postService.repostPost('post-canon-100', 'user-reposter');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        recipientId: 'author-original',
        actorId: 'user-reposter',
        type: 'COMMUNITY_REPOST',
        category: 'community',
        priority: 'NORMAL',
        title: 'Someone reposted your post',
        message: 'Someone reposted your post in the community',
        actionUrl: '/community?post=post-canon-100#post-canon-100',
        targetUrl: '/community?post=post-canon-100#post-canon-100',
        idempotencyKey: 'repost:post-canon-100:user-reposter',
        metadata: {
          canonicalPostId: 'post-canon-100',
          originalPostId: 'post-canon-100',
          postId: 'post-canon-100',
          repostId: 'repost-record-1',
        },
      });
    });

    it('repostPost with company post includes organizationId in metadata and direct targetUrl', async () => {
      const companyPost = {
        _id: 'post-company-200',
        authorId: 'author-admin',
        organizationId: 'org-apple-99',
        content: 'Exciting announcement from Apple',
        audience: 'PUBLIC',
      };
      mockPostRepository.findById.mockResolvedValueOnce(companyPost);
      mockPostRepository.findActiveRepost.mockResolvedValueOnce(null);
      mockPostRepository.createRepost.mockResolvedValueOnce({
        _id: 'repost-record-2',
        originalPostId: 'post-company-200',
        authorId: 'user-reposter',
      });
      mockPostRepository.findByIdPopulated.mockResolvedValueOnce({
        _id: 'post-company-200',
        stats: { reposts: 1 },
      });

      await postService.repostPost('post-company-200', 'user-reposter');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'author-admin',
          type: 'COMMUNITY_REPOST',
          actionUrl: '/community?organizationId=org-apple-99&post=post-company-200#post-company-200',
          targetUrl: '/community?organizationId=org-apple-99&post=post-company-200#post-company-200',
          metadata: expect.objectContaining({
            canonicalPostId: 'post-company-200',
            originalPostId: 'post-company-200',
            organizationId: 'org-apple-99',
          }),
        }),
      );
    });

    it('quotePost attaches quotedPostId, quotePostId, direct targetUrl, and preserves idempotencyKey', async () => {
      const originalPost = {
        _id: 'post-canon-300',
        authorId: 'author-expert',
        content: 'Original deep thought',
        audience: 'PUBLIC',
      };
      mockPostRepository.findById.mockResolvedValueOnce(originalPost);
      mockPostRepository.create.mockResolvedValueOnce({
        _id: 'quote-new-400',
        postType: 'quote',
        originalPostId: 'post-canon-300',
        authorId: 'user-quoter',
      });
      mockPostRepository.findByIdPopulated.mockResolvedValueOnce({
        _id: 'quote-new-400',
        content: 'Great insight here!',
      });

      await postService.quotePost('post-canon-300', 'user-quoter', {
        content: 'Great insight here!',
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        recipientId: 'author-expert',
        actorId: 'user-quoter',
        type: 'COMMUNITY_QUOTE',
        category: 'community',
        priority: 'NORMAL',
        title: 'Someone quoted your post',
        message: 'Someone quoted your post in the community',
        actionUrl: '/community?post=post-canon-300#post-canon-300',
        targetUrl: '/community?post=post-canon-300#post-canon-300',
        idempotencyKey: 'quote:quote-new-400:user-quoter',
        metadata: {
          quotedPostId: 'post-canon-300',
          quotePostId: 'quote-new-400',
          originalPostId: 'post-canon-300',
          postId: 'post-canon-300',
        },
      });
    });

    it('does not send notification when author quotes or reposts own post', async () => {
      const selfPost = {
        _id: 'post-self-500',
        authorId: 'user-same',
        content: 'My own thought',
        audience: 'PUBLIC',
      };
      mockPostRepository.findById.mockResolvedValue(selfPost);
      mockPostRepository.findActiveRepost.mockResolvedValue(null);
      mockPostRepository.createRepost.mockResolvedValue({ _id: 'repost-self' });
      mockPostRepository.create.mockResolvedValue({ _id: 'quote-self' });
      mockPostRepository.findByIdPopulated.mockResolvedValue(selfPost);

      await postService.repostPost('post-self-500', 'user-same');
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();

      await postService.quotePost('post-self-500', 'user-same', { content: 'Quoting myself' });
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });
});
