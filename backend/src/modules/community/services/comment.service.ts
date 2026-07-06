import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommentRepository } from '../repositories/mongo-comment.repository';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { CommentDocument } from '../schemas/comment.schema';
import { PostRepository } from '../repositories/mongo-post.repository';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
  ) {}

  async createComment(
    userId: string,
    postId: string,
    data: CreateCommentDto,
  ): Promise<CommentDocument> {
    const post = await this.postRepository.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const newComment = await this.commentRepository.create({
      authorId: userId,
      postId,
      parentId: data.parentId,
      content: data.content,
      mentions: data.mentions || [],
    });

    // Increment post comment stats
    await this.postRepository.update(postId, {
      $inc: { 'stats.comments': 1 },
    } as any);

    return newComment;
  }

  async getCommentsByPost(
    postId: string,
    limit: number = 10,
    skip: number = 0,
  ): Promise<CommentDocument[]> {
    return this.commentRepository.findByPostId(postId, limit, skip);
  }

  async updateComment(
    id: string,
    userId: string,
    data: UpdateCommentDto,
  ): Promise<CommentDocument> {
    const comment = await this.commentRepository.findById(id);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId)
      throw new ForbiddenException('Unauthorized');

    return this.commentRepository.update(id, { ...data, isEdited: true });
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
