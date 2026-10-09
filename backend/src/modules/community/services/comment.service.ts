import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommentRepository } from '../repositories/mongo-comment.repository';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { PostRepository } from '../repositories/mongo-post.repository';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createComment(
    userId: string,
    postId: string,
    data: CreateCommentDto,
  ): Promise<any> {
    const post = await this.postRepository.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

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
  ): Promise<any[]> {
    return this.commentRepository.findByPostId(postId, limit, skip);
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

    await this.commentRepository.update(id, { ...data, isEdited: true });
    return this.commentRepository.findByIdPopulated(id);
  }

  async deleteComment(
    id: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');

    if (String(comment.authorId) !== String(userId) && role !== 'admin') {
      throw new ForbiddenException('Unauthorized to delete this comment');
    }

    const deleted = await this.commentRepository.softDelete(id);
    if (deleted) {
      await this.postRepository.update(comment.postId, {
        $inc: { 'stats.comments': -1 },
      } as any);
    }
    return deleted;
  }
}
