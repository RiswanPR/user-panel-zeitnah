/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { CommunityS3Service } from './services/community-s3.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../../common/aws/s3.service';

describe('Community Phase 1 - Stability, Security & Core Workflows', () => {
  let postService: PostService;
  let commentService: CommentService;
  let communityS3Service: CommunityS3Service;

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
      providers: [
        PostService,
        CommentService,
        CommunityS3Service,
        { provide: PostRepository, useValue: mockPostRepository },
        { provide: CommentRepository, useValue: mockCommentRepository },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    commentService = module.get<CommentService>(CommentService);
    communityS3Service = module.get<CommunityS3Service>(CommunityS3Service);
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
});
