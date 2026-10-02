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
        await this.notificationsService.createNotification({
          recipientId: post.authorId,
          actorId: userId,
          type: 'COMMUNITY_COMMENT',
          category: 'community',
          priority: 'NORMAL',
          title: 'New comment on your post',
          message: 'Someone commented on your post',
          actionUrl: '/community',
          targetUrl: '/community',
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
    if (comment.authorId !== userId) {
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

    if (comment.authorId !== userId && role !== 'admin') {
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
