import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PostRepository } from '../repositories/mongo-post.repository';
import { CreatePostDto, UpdatePostDto } from '../dto/post.dto';
import { PostDocument } from '../schemas/post.schema';

@Injectable()
export class PostService {
  constructor(private readonly postRepository: PostRepository) {}

  async createPost(userId: string, data: CreatePostDto): Promise<PostDocument> {
    const postData = {
      authorId: userId,
      content: data.content,
      type: data.type,
      audience: data.audience,
      courseId: data.courseId,
      batchId: data.batchId,
      hashtags: data.hashtags || [],
      mentions: data.mentions || [],
      pollExpiresAt: data.pollExpiresAt,
    };

    const createdPost = await this.postRepository.create(postData);

    if (data.media && data.media.length > 0) {
      const mediaWithPostId = data.media.map((m) => ({
        ...m,
        postId: createdPost._id,
      }));
      await this.postRepository.createMedia(mediaWithPostId);
    }

    if (
      data.pollQuestion &&
      data.pollOptions &&
      data.pollOptions.length > 0 &&
      data.pollExpiresAt
    ) {
      await this.postRepository.createPoll(
        {
          postId: createdPost._id,
          question: data.pollQuestion,
          expiresAt: data.pollExpiresAt,
        },
        data.pollOptions,
      );
    }

    return createdPost;
  }

  async getFeed(
    userId: string,
    courseIds: string[],
    limit: number = 10,
    cursor?: string,
  ) {
    return this.postRepository.findFeed({ userId, courseIds, limit, cursor });
  }

  async getPostById(id: string): Promise<PostDocument | null> {
    return this.postRepository.findById(id);
  }

  async updatePost(
    id: string,
    userId: string,
    data: UpdatePostDto,
  ): Promise<PostDocument> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Unauthorized');

    return this.postRepository.update(id, { ...data, isEdited: true });
  }

  async deletePost(id: string, userId: string, role: string): Promise<boolean> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    if (post.authorId !== userId && role !== 'admin') {
      throw new ForbiddenException('Unauthorized to delete this post');
    }

    return this.postRepository.softDelete(id);
  }

  async addReaction(postId: string, userId: string, type: string): Promise<void> {
    return this.postRepository.addReaction(postId, userId, type);
  }

  async removeReaction(postId: string, userId: string): Promise<void> {
    return this.postRepository.removeReaction(postId, userId);
  }
}
