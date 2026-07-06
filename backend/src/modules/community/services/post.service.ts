import { Injectable, Inject } from '@nestjs/common';
import { IPostRepository } from '../repositories/community.repository.interface';
import { IPost, PostType, PostAudience } from '../domain/post.model';

@Injectable()
export class PostService {
  constructor(
    @Inject('IPostRepository') private readonly postRepository: IPostRepository,
  ) {}

  async createPost(userId: string, data: Partial<IPost>): Promise<IPost> {
    const newPost = {
      authorId: userId,
      content: data.content || '',
      type: data.type || PostType.TEXT,
      audience: data.audience || PostAudience.PUBLIC,
      courseId: data.courseId,
      batchId: data.batchId,
      media: data.media || [],
      pollOptions: data.pollOptions || [],
      pollExpiresAt: data.pollExpiresAt,
      hashtags: data.hashtags || [],
      mentions: data.mentions || [],
    };

    return this.postRepository.create(newPost);
  }

  async getFeed(userId: string, courseIds: string[], limit: number = 10, cursor?: string) {
    return this.postRepository.findFeed({ userId, courseIds, limit, cursor });
  }

  async getPostById(id: string): Promise<IPost | null> {
    return this.postRepository.findById(id);
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    const post = await this.postRepository.findById(id);
    if (!post) return false;
    
    // Check authorization: only author can delete (in a real app, admins too)
    if (post.authorId !== userId) {
      throw new Error('Unauthorized to delete this post');
    }

    await this.postRepository.softDelete(id);
    return true;
  }
}
