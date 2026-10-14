import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { CommentRepository } from '../repositories/mongo-comment.repository';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { PostRepository } from '../repositories/mongo-post.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { ModerationService } from '../../moderation/moderation.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly organizationsService?: OrganizationsService,
    @Optional() private readonly moderationService?: ModerationService,
  ) {}

  async createComment(
    userId: string,
    postId: string,
    data: CreateCommentDto,
  ): Promise<any> {
    const post = await this.postRepository.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    // Blocked-user interaction check: prevent commenting if a block relationship exists
    if (this.moderationService && post.authorId) {
      const isBlocked = await this.moderationService.hasBlockRelationship(
        userId,
        String(post.authorId),
      );
      if (isBlocked) {
        throw new ForbiddenException(
          'Interaction is unavailable between blocked users',
        );
      }
    }

    // Reply hierarchy integrity: verify parent comment belongs to this post
    if (data.parentId) {
      const parentComment = await this.commentRepository.findById(data.parentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if (String(parentComment.postId) !== String(postId)) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }
    }

    const newComment = await this.commentRepository.create({
      authorId: userId,
      postId: String(postId),
      parentId: data.parentId,
      content: data.content,
      mentions: data.mentions || [],
    });

    // Increment post comment stats
    await this.postRepository.update(postId, {
      $inc: { 'stats.comments': 1 },
    } as any);

    // If reply, increment parent comment's reply stats
    if (data.parentId) {
      await this.commentRepository.update(data.parentId, {
        $inc: { 'stats.replies': 1 },
      } as any);
    }

    // Populate the newly created comment immediately
    const populated = await this.commentRepository.findByIdPopulated(
      newComment._id,
    );

    // Notify post author if commenter is not the author
    if (post.authorId && String(post.authorId) !== String(userId)) {
      try {
        const isReel =
          post.type === 'VIDEO' ||
          (Array.isArray(post.media) &&
            post.media.some((m: any) => m?.type === 'video'));
        const targetUrl = isReel
          ? `/community/reels/${postId}`
          : `/community#${postId}`;
        await this.notificationsService.createNotification({
          recipientId: post.authorId,
          actorId: userId,
          type: 'COMMUNITY_COMMENT',
          category: 'community',
          priority: 'NORMAL',
          title: isReel
            ? 'New comment on your reel'
            : 'New comment on your post',
          message: isReel
            ? 'Someone commented on your reel'
            : 'Someone commented on your post',
          actionUrl: targetUrl,
          targetUrl: targetUrl,
        });
      } catch (e) {
        // best effort notification
      }
    }

    return populated || newComment;
  }

  async getCommentsByPost(
    postId: string,
    limit: number = 20,
    skip: number = 0,
    currentUserId?: string,
  ): Promise<any[]> {
    const post = await this.postRepository.findById(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundException('Post not found');
    }

    if (currentUserId && this.moderationService && post.authorId) {
      const isBlocked = await this.moderationService.hasBlockRelationship(
        currentUserId,
        String(post.authorId),
      );
      if (isBlocked) {
        throw new NotFoundException('Post not found');
      }
    }

    let excludedUserIds: string[] = [];
    if (currentUserId && this.moderationService) {
      try {
        excludedUserIds =
          await this.moderationService.getExcludedUserIds(currentUserId);
      } catch {
        excludedUserIds = [];
      }
    }
    return this.commentRepository.findByPostId(
      postId,
      limit,
      skip,
      excludedUserIds,
    );
  }

  async updateComment(
    id: string,
    userId: string,
    data: UpdateCommentDto,
  ): Promise<any> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (String(comment.authorId) !== String(userId)) {
      throw new ForbiddenException('Unauthorized to update this comment');
    }

    await this.commentRepository.update(id, {
      content: data.content,
      isEdited: true,
    });
    return this.commentRepository.findByIdPopulated(id);
  }

  async deleteComment(
    id: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');

    const post = await this.postRepository.findById(comment.postId);

    const isCommentAuthor = String(comment.authorId) === String(userId);
    const isPostOwner = Boolean(
      post && post.authorId && String(post.authorId) === String(userId),
    );
    const cleanRole = String(role || '').trim().toUpperCase();
    const isAdmin =
      role === 'admin' ||
      role === 'superadmin' ||
      role === 'teacher' ||
      cleanRole === 'ADMIN' ||
      cleanRole === 'SUPERADMIN' ||
      cleanRole === 'EDUCATOR';

    let isOrgManager = false;
    if (
      !isCommentAuthor &&
      !isPostOwner &&
      !isAdmin &&
      post &&
      post.organizationId &&
      this.organizationsService
    ) {
      try {
        await this.organizationsService.validateCompanyPublishingAccess(
          userId,
          post.organizationId,
        );
        isOrgManager = true;
      } catch {
        isOrgManager = false;
      }
    }

    if (!isCommentAuthor && !isPostOwner && !isOrgManager && !isAdmin) {
      throw new ForbiddenException(
        'Unauthorized to delete or moderate this comment',
      );
    }

    const deleted = await this.commentRepository.softDelete(id);
    if (deleted) {
      await this.postRepository.update(comment.postId, {
        $inc: { 'stats.comments': -1 },
      } as any);

      if (comment.parentId) {
        await this.commentRepository.update(comment.parentId, {
          $inc: { 'stats.replies': -1 },
        } as any);
      }
    }
    return deleted;
  }
}
