import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentService } from './services/comment.service';
import { CommentRepository } from './repositories/mongo-comment.repository';
import { PostRepository } from './repositories/mongo-post.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ModerationService } from '../moderation/moderation.service';
import { ReportTargetType, ReportStatus } from '../moderation/schemas/report.schema';
import { Types } from 'mongoose';

describe('Zeitnah Community — Phase 5: Comments, Moderation & Interaction Integrity', () => {
  let commentService: CommentService;
  let mockCommentRepo: any;
  let mockPostRepo: any;
  let mockNotificationsService: any;
  let mockOrganizationsService: any;
  let mockModerationService: any;

  const commentAuthorId = new Types.ObjectId().toString();
  const postOwnerId = new Types.ObjectId().toString();
  const companyManagerId = new Types.ObjectId().toString();
  const unauthorizedCompanyManagerId = new Types.ObjectId().toString();
  const formerManagerId = new Types.ObjectId().toString();
  const followerId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();
  const blockedUserId = new Types.ObjectId().toString();
  const companyId = new Types.ObjectId().toString();
  const unrelatedCompanyId = new Types.ObjectId().toString();

  const personalPostId = new Types.ObjectId().toString();
  const companyPostId = new Types.ObjectId().toString();
  const otherPostId = new Types.ObjectId().toString();

  const comment1Id = new Types.ObjectId().toString();
  const reply1Id = new Types.ObjectId().toString();
  const otherPostCommentId = new Types.ObjectId().toString();

  beforeEach(async () => {
    // In-memory mock repositories and services
    const posts: Record<string, any> = {
      [personalPostId]: {
        _id: personalPostId,
        authorId: postOwnerId,
        content: 'Personal post about system design',
        organizationId: null,
        stats: { comments: 2, likes: 5 },
      },
      [companyPostId]: {
        _id: companyPostId,
        authorId: postOwnerId,
        content: 'Official announcement from Zeitnah',
        organizationId: companyId,
        stats: { comments: 1, likes: 10 },
      },
      [otherPostId]: {
        _id: otherPostId,
        authorId: new Types.ObjectId().toString(),
        content: 'Another post entirely',
        organizationId: null,
        stats: { comments: 1, likes: 0 },
      },
    };

    const comments: Record<string, any> = {
      [comment1Id]: {
        _id: comment1Id,
        authorId: commentAuthorId,
        postId: personalPostId,
        parentId: null,
        content: 'Great post!',
        isDeleted: false,
        stats: { likes: 0, replies: 1 },
      },
      [reply1Id]: {
        _id: reply1Id,
        authorId: commentAuthorId,
        postId: personalPostId,
        parentId: comment1Id,
        content: 'Replying to great post!',
        isDeleted: false,
        stats: { likes: 0, replies: 0 },
      },
      [otherPostCommentId]: {
        _id: otherPostCommentId,
        authorId: new Types.ObjectId().toString(),
        postId: otherPostId,
        parentId: null,
        content: 'Comment on other post',
        isDeleted: false,
        stats: { likes: 0, replies: 0 },
      },
    };

    mockPostRepo = {
      findById: jest.fn().mockImplementation((id: string) => Promise.resolve(posts[id] || null)),
      update: jest.fn().mockImplementation((id: string, updateQuery: any) => {
        const post = posts[id];
        if (!post) return Promise.resolve(null);
        if (updateQuery.$inc) {
          if (updateQuery.$inc['stats.comments']) {
            post.stats.comments = Math.max(0, (post.stats.comments || 0) + updateQuery.$inc['stats.comments']);
          }
        }
        return Promise.resolve(post);
      }),
    };

    mockCommentRepo = {
      create: jest.fn().mockImplementation((data: any) => {
        const newId = new Types.ObjectId().toString();
        const created = {
          _id: newId,
          ...data,
          isDeleted: false,
          stats: { likes: 0, replies: 0 },
          createdAt: new Date(),
        };
        comments[newId] = created;
        return Promise.resolve(created);
      }),
      findById: jest.fn().mockImplementation((id: string) => {
        const c = comments[id];
        if (!c || c.isDeleted) return Promise.resolve(null);
        return Promise.resolve(c);
      }),
      findByIdPopulated: jest.fn().mockImplementation((id: string) => {
        const c = comments[id];
        if (!c || c.isDeleted) return Promise.resolve(null);
        return Promise.resolve({ ...c, author: { name: 'Commenter' } });
      }),
      findByPostId: jest.fn().mockImplementation((postId: string, limit: number, skip: number, excludedUserIds: string[] = []) => {
        const filtered = Object.values(comments).filter(
          (c) => c.postId === postId && !c.isDeleted && !excludedUserIds.includes(c.authorId),
        );
        return Promise.resolve(filtered.slice(skip, skip + limit));
      }),
      update: jest.fn().mockImplementation((id: string, updateQuery: any) => {
        const c = comments[id];
        if (!c || c.isDeleted) return Promise.resolve(null);
        if (updateQuery.$inc && updateQuery.$inc['stats.replies']) {
          c.stats.replies = Math.max(0, (c.stats.replies || 0) + updateQuery.$inc['stats.replies']);
        }
        if (updateQuery.content) {
          c.content = updateQuery.content;
          c.isEdited = true;
        }
        return Promise.resolve(c);
      }),
      softDelete: jest.fn().mockImplementation((id: string) => {
        const c = comments[id];
        if (!c || c.isDeleted) return Promise.resolve(false);
        c.isDeleted = true;
        return Promise.resolve(true);
      }),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ success: true }),
    };

    mockOrganizationsService = {
      validateCompanyPublishingAccess: jest.fn().mockImplementation(async (userId: string, orgId: string) => {
        if (userId === companyManagerId && orgId === companyId) {
          return {
            organization: { _id: companyId, name: 'Zeitnah' },
            membership: { role: 'admin', status: 'ACTIVE' },
          };
        }
        if (userId === unauthorizedCompanyManagerId) {
          throw new ForbiddenException('Forbidden: User is not authorized to act on behalf of this company');
        }
        if (userId === formerManagerId) {
          throw new ForbiddenException('Forbidden: Membership is inactive or removed');
        }
        if (userId === followerId) {
          throw new ForbiddenException('Forbidden: Company followers do not have management authority');
        }
        throw new ForbiddenException('Forbidden: User does not have company publishing access');
      }),
    };

    mockModerationService = {
      hasBlockRelationship: jest.fn().mockImplementation(async (uA: string, uB: string) => {
        return (uA === blockedUserId && uB === postOwnerId) || (uA === postOwnerId && uB === blockedUserId);
      }),
      getExcludedUserIds: jest.fn().mockImplementation(async (userId: string) => {
        if (userId === postOwnerId) return [blockedUserId];
        if (userId === blockedUserId) return [postOwnerId];
        return [];
      }),
      createReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: CommentRepository, useValue: mockCommentRepo },
        { provide: PostRepository, useValue: mockPostRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: ModerationService, useValue: mockModerationService },
      ],
    }).compile();

    commentService = module.get<CommentService>(CommentService);
  });

  describe('1. Comment Permissions & Deletion Matrix', () => {
    it('allows comment author to delete their own comment', async () => {
      const result = await commentService.deleteComment(comment1Id, commentAuthorId, 'student');
      expect(result).toBe(true);
      expect(mockCommentRepo.softDelete).toHaveBeenCalledWith(comment1Id);
      // Decrements post comments count
      expect(mockPostRepo.update).toHaveBeenCalledWith(personalPostId, {
        $inc: { 'stats.comments': -1 },
      });
    });

    it('allows post owner to moderate comments on their post', async () => {
      const result = await commentService.deleteComment(comment1Id, postOwnerId, 'student');
      expect(result).toBe(true);
      expect(mockCommentRepo.softDelete).toHaveBeenCalledWith(comment1Id);
    });

    it('allows authorized current company manager to moderate comments on company post', async () => {
      // Create a comment on the company post
      const companyComment = await mockCommentRepo.create({
        authorId: commentAuthorId,
        postId: companyPostId,
        content: 'Customer inquiry',
      });

      const result = await commentService.deleteComment(
        companyComment._id,
        companyManagerId,
        'student',
      );
      expect(result).toBe(true);
      expect(mockOrganizationsService.validateCompanyPublishingAccess).toHaveBeenCalledWith(
        companyManagerId,
        companyId,
      );
      expect(mockCommentRepo.softDelete).toHaveBeenCalledWith(companyComment._id);
    });

    it('rejects manager of an unrelated company with ForbiddenException', async () => {
      const companyComment = await mockCommentRepo.create({
        authorId: commentAuthorId,
        postId: companyPostId,
        content: 'Comment on company post',
      });

      await expect(
        commentService.deleteComment(
          companyComment._id,
          unauthorizedCompanyManagerId,
          'student',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects former company manager whose permissions are stale', async () => {
      const companyComment = await mockCommentRepo.create({
        authorId: commentAuthorId,
        postId: companyPostId,
        content: 'Comment on company post',
      });

      await expect(
        commentService.deleteComment(companyComment._id, formerManagerId, 'student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects company followers who gain no moderation privileges by following', async () => {
      const companyComment = await mockCommentRepo.create({
        authorId: commentAuthorId,
        postId: companyPostId,
        content: 'Comment on company post',
      });

      await expect(
        commentService.deleteComment(companyComment._id, followerId, 'student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows administrators to moderate comments according to policy', async () => {
      const resultAdmin = await commentService.deleteComment(
        comment1Id,
        adminId,
        'admin',
      );
      expect(resultAdmin).toBe(true);
    });

    it('rejects random unauthorized user from deleting someone else comment', async () => {
      const randomUserId = new Types.ObjectId().toString();
      await expect(
        commentService.deleteComment(comment1Id, randomUserId, 'student'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Safe Deletion & Data Integrity', () => {
    it('verifies that comment deletion cannot affect another post comment counts', async () => {
      // Deleting a comment on personalPostId only touches personalPostId
      await commentService.deleteComment(comment1Id, commentAuthorId, 'student');
      expect(mockPostRepo.update).toHaveBeenCalledWith(personalPostId, expect.anything());
      expect(mockPostRepo.update).not.toHaveBeenCalledWith(otherPostId, expect.anything());
    });

    it('updates reply counts correctly on parent comment when reply is deleted', async () => {
      const result = await commentService.deleteComment(reply1Id, commentAuthorId, 'student');
      expect(result).toBe(true);
      // Decrements parent comment replies count
      expect(mockCommentRepo.update).toHaveBeenCalledWith(comment1Id, {
        $inc: { 'stats.replies': -1 },
      });
    });

    it('prevents repeated deletion from double-decrementing counts', async () => {
      // First deletion succeeds
      await commentService.deleteComment(comment1Id, commentAuthorId, 'student');
      // Second deletion on soft-deleted comment throws NotFoundException
      await expect(
        commentService.deleteComment(comment1Id, commentAuthorId, 'student'),
      ).rejects.toThrow(NotFoundException);
    });

    it('prevents unauthorized edits to another user comment', async () => {
      const randomUserId = new Types.ObjectId().toString();
      await expect(
        commentService.updateComment(comment1Id, randomUserId, {
          content: 'Hacked comment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows author to edit comment and marks isEdited: true without allowing mass-assignment', async () => {
      await commentService.updateComment(comment1Id, commentAuthorId, {
        content: 'Updated insightful comment',
      });
      expect(mockCommentRepo.update).toHaveBeenCalledWith(comment1Id, {
        content: 'Updated insightful comment',
        isEdited: true,
      });
    });
  });

  describe('3. Reply Hierarchy & Parent-Post Ownership Validation', () => {
    it('successfully creates reply when parent comment belongs to the same post', async () => {
      const reply = await commentService.createComment(commentAuthorId, personalPostId, {
        content: 'Valid threaded reply',
        parentId: comment1Id,
      });
      expect(reply).toBeDefined();
      expect(mockCommentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: comment1Id,
          postId: personalPostId,
          content: 'Valid threaded reply',
        }),
      );
      // Increments parent comment reply count
      expect(mockCommentRepo.update).toHaveBeenCalledWith(comment1Id, {
        $inc: { 'stats.replies': 1 },
      });
    });

    it('rejects reply when parent comment belongs to a different post', async () => {
      // otherPostCommentId belongs to otherPostId, not personalPostId
      await expect(
        commentService.createComment(commentAuthorId, personalPostId, {
          content: 'Cross-post reply injection attempt',
          parentId: otherPostCommentId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reply when parent comment does not exist', async () => {
      const nonExistentCommentId = new Types.ObjectId().toString();
      await expect(
        commentService.createComment(commentAuthorId, personalPostId, {
          content: 'Reply to non-existent comment',
          parentId: nonExistentCommentId,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Blocked-User Interaction & Visibility Rules', () => {
    it('blocks user from commenting on a post when block relationship exists', async () => {
      await expect(
        commentService.createComment(blockedUserId, personalPostId, {
          content: 'Trying to comment while blocked',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('filters out comments by blocked authors when retrieving comments for a post', async () => {
      // Add a comment from blocked user
      await mockCommentRepo.create({
        authorId: blockedUserId,
        postId: personalPostId,
        content: 'Hidden blocked comment',
      });

      const comments = await commentService.getCommentsByPost(
        personalPostId,
        20,
        0,
        postOwnerId,
      );
      expect(mockModerationService.getExcludedUserIds).toHaveBeenCalledWith(postOwnerId);
      expect(mockCommentRepo.findByPostId).toHaveBeenCalledWith(
        personalPostId,
        20,
        0,
        [blockedUserId],
      );
      expect(comments.every((c: any) => c.authorId !== blockedUserId)).toBe(true);
    });
  });

  describe('5. Report Deduplication & Moderation Security', () => {
    it('deduplicates identical pending reports in ModerationService', async () => {
      // Mock reportModel with deduplication
      const existingReport = {
        _id: new Types.ObjectId().toString(),
        reporterId: new Types.ObjectId(commentAuthorId),
        targetType: ReportTargetType.COMMUNITY,
        targetId: comment1Id,
        status: ReportStatus.PENDING,
        reason: 'SPAM',
      };

      const mockReportModel: any = {
        findOne: jest.fn().mockResolvedValue(existingReport),
        create: jest.fn(),
      };
      const mockBlockModel: any = {};

      const { ModerationService } = await import('../moderation/moderation.service');
      const modService = new ModerationService(mockBlockModel, mockReportModel);

      const res = await modService.createReport(commentAuthorId, {
        targetType: ReportTargetType.COMMUNITY,
        targetId: comment1Id,
        reason: 'SPAM',
      });

      expect(res).toBe(existingReport);
      expect(mockReportModel.create).not.toHaveBeenCalled();
    });

    it('creates new report when no pending report exists for that target', async () => {
      const createdReport = {
        _id: new Types.ObjectId().toString(),
        reporterId: new Types.ObjectId(commentAuthorId),
        targetType: ReportTargetType.COMMUNITY,
        targetId: comment1Id,
        status: ReportStatus.PENDING,
        reason: 'HARASSMENT',
      };

      const mockReportModel: any = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdReport),
      };
      const mockBlockModel: any = {};

      const { ModerationService } = await import('../moderation/moderation.service');
      const modService = new ModerationService(mockBlockModel, mockReportModel);

      const res = await modService.createReport(commentAuthorId, {
        targetType: ReportTargetType.COMMUNITY,
        targetId: comment1Id,
        reason: 'HARASSMENT',
      });

      expect(res).toBe(createdReport);
      expect(mockReportModel.create).toHaveBeenCalled();
    });

    it('rejects invalid reporterId or missing targetId with BadRequestException', async () => {
      const { ModerationService } = await import('../moderation/moderation.service');
      const modService = new ModerationService({} as any, {} as any);

      await expect(
        modService.createReport('invalid-id', {
          targetType: ReportTargetType.COMMUNITY,
          targetId: comment1Id,
          reason: 'SPAM',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        modService.createReport(commentAuthorId, {
          targetType: ReportTargetType.COMMUNITY,
          targetId: '   ',
          reason: 'SPAM',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
