import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PostRepository } from '../repositories/mongo-post.repository';
import { CreatePostDto, UpdatePostDto } from '../dto/post.dto';
import { PostDocument } from '../schemas/post.schema';
import { CommunityGateway } from '../gateways/community.gateway';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly communityGateway: CommunityGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createPost(userId: string, data: CreatePostDto): Promise<any> {
    const postData: any = {
      authorId: userId,
      content: data.content,
      type: data.type || 'text',
      audience: data.audience || 'public',
      courseId: data.courseId,
      batchId: data.batchId,
      hashtags: data.hashtags || [],
      mentions: data.mentions || [],
      tags: data.tags || [],
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

    // Fetch the fully populated post immediately so the client has author, avatar, media, counts, etc.
    const populatedPost = await this.postRepository.findByIdPopulated(
      createdPost._id,
      userId,
    );

    if (populatedPost) {
      this.communityGateway.emitPostCreated(
        populatedPost.courseId,
        populatedPost,
      );
    }

    return populatedPost || createdPost;
  }

  async getFeed(
    userId: string,
    courseIds: string[],
    limit: number = 10,
    cursor?: string,
  ) {
    return this.postRepository.findFeed({ userId, courseIds, limit, cursor });
  }

  async getPostById(id: string, userId?: string): Promise<any> {
    return this.postRepository.findByIdPopulated(id, userId);
  }

  async updatePost(
    id: string,
    userId: string,
    role: string,
    data: UpdatePostDto,
  ): Promise<any> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && role !== 'admin') {
      throw new ForbiddenException('Unauthorized to edit this post');
    }

    await this.postRepository.update(id, { ...data, isEdited: true });
    return this.postRepository.findByIdPopulated(id, userId);
  }

  async deletePost(id: string, userId: string, role: string): Promise<boolean> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    if (post.authorId !== userId && role !== 'admin') {
      throw new ForbiddenException('Unauthorized to delete this post');
    }

    return this.postRepository.softDelete(id);
  }

  async addReaction(
    postId: string,
    userId: string,
    type: string,
  ): Promise<any> {
    const result = await this.postRepository.addReaction(postId, userId, type);

    // Send notification if user added reaction and is not the author
    if (result.action === 'added') {
      const post = await this.postRepository.findById(postId);
      if (post && post.authorId && String(post.authorId) !== String(userId)) {
        try {
          await this.notificationsService.createNotification({
            recipientId: post.authorId,
            actorId: userId,
            type: 'COMMUNITY_REACTION',
            category: 'community',
            priority: 'NORMAL',
            title: 'New reaction on your post',
            message: 'Someone reacted to your post',
            actionUrl: '/community',
            targetUrl: '/community',
          });
        } catch (e) {
          // best-effort
        }
      }
    }

    return result;
  }

  async removeReaction(postId: string, userId: string): Promise<any> {
    return this.postRepository.removeReaction(postId, userId);
  }

  async savePost(postId: string, userId: string): Promise<any> {
    return this.postRepository.savePost(postId, userId);
  }

  async removeSavedPost(postId: string, userId: string): Promise<any> {
    return this.postRepository.removeSavedPost(postId, userId);
  }
}
