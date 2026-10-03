import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PostRepository } from '../repositories/mongo-post.repository';
import { CreatePostDto, UpdatePostDto, QuotePostDto } from '../dto/post.dto';
import { PostDocument } from '../schemas/post.schema';
import { CommunityGateway } from '../gateways/community.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { SignedUrlService } from '../../../common/aws/signed-url.service';
import { CommunityS3Service } from './community-s3.service';
import { CommunityIdempotencyService } from './community-idempotency.service';

@Injectable()
export class PostService {
  // In-flight locks & short-window duplicate publish protection (Section 12)
  private readonly inFlightPostRequests = new Map<string, Promise<any>>();
  private readonly recentPostsCache = new Map<string, { post: any; timestamp: number }>();

  constructor(
    private readonly postRepository: PostRepository,
    private readonly communityGateway: CommunityGateway,
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly signedUrlService?: SignedUrlService,
    @Optional() private readonly communityS3Service?: CommunityS3Service,
    @Optional() private readonly communityIdempotencyService?: CommunityIdempotencyService,
  ) {}

  private async resolveMediaUrls(posts: any[]): Promise<any[]> {
    if (!this.signedUrlService || !Array.isArray(posts)) return posts;
    for (const post of posts) {
      if (!post) continue;
      const mediaList = [
        ...(Array.isArray(post.media) ? post.media : []),
        ...(Array.isArray(post.quotedPost?.media) ? post.quotedPost.media : []),
        ...(Array.isArray(post.originalPost?.media) ? post.originalPost.media : []),
      ];
      for (const m of mediaList) {
        if (m?.url && (m.url.includes('.amazonaws.com') || !m.url.startsWith('http'))) {
          try {
            // Strip any stale ephemeral query parameters to obtain canonical base S3 key or URL
            const cleanUrl = m.url.split('?')[0];
            const signed = await this.signedUrlService.generateSignedImageUrl(cleanUrl, 86400 * 7);
            if (signed) {
              m.url = signed;
            }
          } catch {}
        }
      }
    }
    return posts;
  }

  /**
   * Authoritative validation and normalization for post media (Sections 5, 6, 8, 13).
   */
  private validateAndNormalizeMedia(
    mediaList: any[],
    userId: string,
    isAdmin: boolean = false,
  ): any[] {
    if (!Array.isArray(mediaList) || mediaList.length === 0) return [];

    // Max 10 items (Section 8 & 13)
    if (mediaList.length > 10) {
      throw new BadRequestException('Maximum 10 media items allowed per post');
    }

    const seenUrls = new Set<string>();
    const normalized: any[] = [];

    for (const m of mediaList) {
      if (!m || typeof m !== 'object') {
        throw new BadRequestException('Invalid media item');
      }

      if (!m.url || typeof m.url !== 'string' || !m.url.trim()) {
        throw new BadRequestException('Media URL cannot be empty');
      }

      const rawUrl = m.url.trim();

      // Check media type
      const allowedTypes = ['image', 'video', 'document'];
      const mediaType = m.type || 'image';
      if (!allowedTypes.includes(mediaType)) {
        throw new BadRequestException(`Invalid media type: ${mediaType}`);
      }

      // Check authoritative size limits if provided
      if (mediaType === 'image' && m.size && m.size > 15 * 1024 * 1024) {
        throw new BadRequestException('Image exceeds authoritative size limit of 15MB');
      }
      if (mediaType === 'video' && m.size && m.size > 50 * 1024 * 1024) {
        throw new BadRequestException('Video exceeds authoritative size limit of 50MB');
      }

      // Authoritative Media Ownership & Path Traversal Check (Section 5 & 6)
      if (this.communityS3Service) {
        this.communityS3Service.validateMediaOwnership(rawUrl, userId, isAdmin);
      } else {
        // Fallback validation when communityS3Service is unprovided in isolated tests
        let decoded = rawUrl;
        try {
          let prev = '';
          while (decoded !== prev) {
            prev = decoded;
            decoded = decodeURIComponent(decoded);
          }
        } catch {
          throw new BadRequestException('Malformed media URL encoding');
        }
        if (decoded.includes('..') || decoded.includes('\\')) {
          throw new ForbiddenException('Invalid file key: path traversal detected');
        }
        if (decoded.includes('community/uploads/')) {
          const expected = `community/uploads/${userId}/`;
          if (!isAdmin && !decoded.includes(expected)) {
            throw new ForbiddenException('You cannot use media belonging to another user');
          }
        }
      }

      // Clean ephemeral query parameters (e.g. ?X-Amz-Signature=...) before storing in DB
      const cleanUrl = rawUrl.split('?')[0];

      if (seenUrls.has(cleanUrl)) {
        continue; // Deduplicate duplicate media items within the same post
      }
      seenUrls.add(cleanUrl);

      normalized.push({
        ...m,
        url: cleanUrl,
        type: mediaType,
      });
    }

    return normalized;
  }

  async createPost(
    userId: string,
    data: CreatePostDto,
    isAdmin: boolean = false,
    idempotencyKey?: string,
  ): Promise<any> {
    const clientKey = idempotencyKey || (data as any)?.idempotencyKey;
    if (this.communityIdempotencyService && clientKey) {
      return this.communityIdempotencyService.executeWithIdempotency(
        userId,
        'CREATE_POST',
        clientKey,
        data,
        () => this.executePostCreation(userId, data, isAdmin, clientKey),
      );
    }
    return this.executePostCreation(userId, data, isAdmin, clientKey);
  }

  private async executePostCreation(
    userId: string,
    data: CreatePostDto,
    isAdmin: boolean = false,
    clientKey?: string,
  ): Promise<any> {
    // In-flight locks & short-window duplicate publish protection (Section 12):
    // Deduplicate rapid concurrent submissions / enter spam
    const mediaFingerprint = (data.media || []).map((m: any) => m.url).sort().join(',');
    const fingerprint = clientKey
      ? `${userId}:key:${clientKey}`
      : `${userId}:${data.content?.trim() || ''}:${mediaFingerprint}:${data.courseId || ''}`;

    if (this.inFlightPostRequests.has(fingerprint)) {
      return await this.inFlightPostRequests.get(fingerprint);
    }

    if (!clientKey) {
      const recent = this.recentPostsCache.get(fingerprint);
      if (recent && Date.now() - recent.timestamp < 3000) {
        return recent.post;
      }
    }

    const execution = async () => {
      // Validate and normalize media first before creating post (Section 5, 6, 8, 13)
      const validatedMedia = this.validateAndNormalizeMedia(data.media || [], userId, isAdmin);

      const postData: any = {
        authorId: userId,
        content: data.content,
        type: data.type || (validatedMedia.length > 0 ? validatedMedia[0].type : 'text'),
        audience: data.audience || 'public',
        courseId: data.courseId,
        batchId: data.batchId,
        hashtags: data.hashtags || [],
        mentions: data.mentions || [],
        tags: data.tags || [],
        pollExpiresAt: data.pollExpiresAt,
      };

      const createdPost = await this.postRepository.create(postData);

      if (validatedMedia.length > 0) {
        const mediaWithPostId = validatedMedia.map((m) => ({
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

      const postToReturn = populatedPost || createdPost;
      if (postToReturn) {
        await this.resolveMediaUrls([postToReturn]);
      }

      return postToReturn;
    };

    const promise = execution();
    this.inFlightPostRequests.set(fingerprint, promise);

    try {
      const result = await promise;
      if (!clientKey) {
        this.recentPostsCache.set(fingerprint, { post: result, timestamp: Date.now() });
        const timer = setTimeout(() => {
          if (this.recentPostsCache.get(fingerprint)?.post?._id === result?._id) {
            this.recentPostsCache.delete(fingerprint);
          }
        }, 5000);
        timer.unref?.();
      }
      return result;
    } finally {
      this.inFlightPostRequests.delete(fingerprint);
    }
  }

  async getFeed(
    userId: string,
    courseIds: string[],
    limit: number = 10,
    cursor?: string,
    filter?: string,
  ) {
    const feed: any = await this.postRepository.findFeed({ userId, courseIds, limit, cursor, filter });
    if (feed && Array.isArray(feed.items)) {
      await this.resolveMediaUrls(feed.items);
    }
    return feed;
  }

  async getSavedPosts(
    userId: string,
    courseIds: string[] = [],
    limit: number = 10,
    cursor?: string,
  ) {
    const saved: any = await this.postRepository.findFeed({ userId, courseIds, limit, cursor, filter: 'saved' });
    if (saved && Array.isArray(saved.items)) {
      await this.resolveMediaUrls(saved.items);
    }
    return saved;
  }

  async getPostById(id: string, userId?: string): Promise<any> {
    const post = await this.postRepository.findByIdPopulated(id, userId);
    if (post) {
      await this.resolveMediaUrls([post]);
    }
    return post;
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

    if ((data as any).media) {
      this.validateAndNormalizeMedia((data as any).media, userId, role === 'admin');
    }

    await this.postRepository.update(id, { ...data, isEdited: true });
    const updated = await this.postRepository.findByIdPopulated(id, userId);
    if (updated) {
      await this.resolveMediaUrls([updated]);
    }
    return updated;
  }

  async deletePost(id: string, userId: string, role: string): Promise<boolean> {
    const post = await this.postRepository.findById(id);
    if (!post) throw new NotFoundException('Post not found');

    if (post.authorId !== userId && role !== 'admin') {
      throw new ForbiddenException('Unauthorized to delete this post');
    }

    if ((post.postType === 'repost' || post.postType === 'quote') && post.originalPostId) {
      await this.postRepository.adjustRepostCount(post.originalPostId, -1);
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

  // Phase 3A.1 Helper: Course access verification
  private verifyPostAccess(
    post: any,
    userId: string,
    courseIds: string[] = [],
    role?: string,
  ): void {
    if (!post) return;
    if (role === 'admin' || role === 'ADMIN' || role === 'teacher' || role === 'TEACHER') return;
    if (String(post.authorId) === String(userId)) return;

    const audience = String(post.audience || '').toUpperCase();
    if (audience === 'COURSE') {
      const postCourseId = String(post.courseId || '');
      const userCourseIds = courseIds.map(String);
      if (!postCourseId || !userCourseIds.includes(postCourseId)) {
        throw new ForbiddenException('Access denied to course-restricted post');
      }
    }
  }

  // Phase 3A: Repost, Unrepost & Quote
  async repostPost(
    id: string,
    userId: string,
    courseIds: string[] = [],
    role?: string,
  ): Promise<any> {
    const target = await this.postRepository.findById(id);
    if (!target || target.isDeleted) {
      throw new NotFoundException('Post not found or unavailable');
    }

    this.verifyPostAccess(target, userId, courseIds, role);

    // Nesting protection: if target is a repost, resolve canonical original
    let canonicalPostId = id;
    let canonicalPost = target;
    if (target.postType === 'repost' && target.originalPostId) {
      canonicalPostId = target.originalPostId;
      const original = await this.postRepository.findById(canonicalPostId);
      if (!original || original.isDeleted) {
        throw new NotFoundException('Original post unavailable');
      }
      this.verifyPostAccess(original, userId, courseIds, role);
      canonicalPost = original;
    }

    // Idempotency: check if user already has an active repost of this canonical post
    const existing = await this.postRepository.findActiveRepost(canonicalPostId, userId);
    if (existing) {
      const populated = await this.postRepository.findByIdPopulated(canonicalPostId, userId);
      return {
        success: true,
        message: 'Already reposted',
        isReposted: true,
        repostsCount: canonicalPost.stats?.reposts || 0,
        repost: existing,
        post: populated,
      };
    }

    // Create repost with race-condition resiliency
    let createdRepost: any;
    try {
      createdRepost = await this.postRepository.createRepost({
        originalPostId: canonicalPostId,
        authorId: userId,
        audience: canonicalPost.audience,
        courseId: canonicalPost.courseId,
        batchId: canonicalPost.batchId,
      });

      // Increment reposts count on canonical post
      await this.postRepository.adjustRepostCount(canonicalPostId, 1);
    } catch (err: any) {
      if (err?.code === 11000 || err?.name === 'MongoServerError') {
        const existingAfterRace = await this.postRepository.findActiveRepost(canonicalPostId, userId);
        if (existingAfterRace) {
          const populated = await this.postRepository.findByIdPopulated(canonicalPostId, userId);
          return {
            success: true,
            message: 'Already reposted',
            isReposted: true,
            repostsCount: canonicalPost.stats?.reposts || 1,
            repost: existingAfterRace,
            post: populated,
          };
        }
      }
      throw err;
    }

    // Send notification to canonical post author (skip if self)
    if (canonicalPost.authorId && String(canonicalPost.authorId) !== String(userId)) {
      try {
        await this.notificationsService.createNotification({
          recipientId: canonicalPost.authorId,
          actorId: userId,
          type: 'COMMUNITY_REPOST',
          category: 'community',
          priority: 'NORMAL',
          title: 'Someone reposted your post',
          message: 'Someone reposted your post in the community',
          actionUrl: '/community',
          targetUrl: '/community',
          idempotencyKey: `repost:${canonicalPostId}:${userId}`,
        });
      } catch (err) {
        // Notification is best-effort
      }
    }

    const populatedCanonical = await this.postRepository.findByIdPopulated(canonicalPostId, userId);

    return {
      success: true,
      message: 'Post reposted successfully',
      isReposted: true,
      repostsCount: (canonicalPost.stats?.reposts || 0) + 1,
      repost: createdRepost,
      post: populatedCanonical,
    };
  }

  async unrepostPost(id: string, userId: string): Promise<any> {
    const target = await this.postRepository.findById(id);
    let canonicalPostId = id;
    if (target && target.postType === 'repost' && target.originalPostId) {
      canonicalPostId = target.originalPostId;
    }

    const removed = await this.postRepository.removeRepost(canonicalPostId, userId);
    if (removed) {
      await this.postRepository.adjustRepostCount(canonicalPostId, -1);
    }

    const populatedCanonical = await this.postRepository.findByIdPopulated(canonicalPostId, userId);

    return {
      success: true,
      message: 'Repost removed successfully',
      isReposted: false,
      repostsCount: Math.max(0, (populatedCanonical?.stats?.reposts ?? ((target?.stats?.reposts || 1) - 1))),
      post: populatedCanonical,
    };
  }

  async quotePost(
    id: string,
    userId: string,
    data: QuotePostDto,
    courseIds: string[] = [],
    role?: string,
  ): Promise<any> {
    const target = await this.postRepository.findById(id);
    if (!target || target.isDeleted) {
      throw new NotFoundException('Post not found or unavailable');
    }

    this.verifyPostAccess(target, userId, courseIds, role);

    // Nesting protection: if target is a repost, embed canonical original
    let canonicalPostId = id;
    let canonicalPost = target;
    if (target.postType === 'repost' && target.originalPostId) {
      canonicalPostId = target.originalPostId;
      const original = await this.postRepository.findById(canonicalPostId);
      if (!original || original.isDeleted) {
        throw new NotFoundException('Original post unavailable');
      }
      this.verifyPostAccess(original, userId, courseIds, role);
      canonicalPost = original;
    }

    const trimmedContent = (data.content || '').trim();
    if (!trimmedContent) {
      throw new BadRequestException('Quote commentary cannot be empty');
    }

    const postData: any = {
      authorId: userId,
      content: trimmedContent,
      quoteText: trimmedContent,
      postType: 'quote',
      originalPostId: canonicalPostId,
      type: 'text',
      audience: data.audience || canonicalPost.audience || 'public',
      courseId: data.courseId || canonicalPost.courseId,
      hashtags: [],
      mentions: [],
      tags: [],
      stats: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        reposts: 0,
      },
      isDeleted: false,
    };

    const createdPost = await this.postRepository.create(postData);

    // Increment repost count on canonical post
    await this.postRepository.adjustRepostCount(canonicalPostId, 1);

    // Send notification to canonical post author (skip if self)
    if (canonicalPost.authorId && String(canonicalPost.authorId) !== String(userId)) {
      try {
        await this.notificationsService.createNotification({
          recipientId: canonicalPost.authorId,
          actorId: userId,
          type: 'COMMUNITY_QUOTE',
          category: 'community',
          priority: 'NORMAL',
          title: 'Someone quoted your post',
          message: 'Someone quoted your post in the community',
          actionUrl: '/community',
          targetUrl: '/community',
          idempotencyKey: `quote:${createdPost._id}:${userId}`,
        });
      } catch (err) {
        // Notification is best-effort
      }
    }

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

    const postToReturn = populatedPost || createdPost;
    if (postToReturn) {
      await this.resolveMediaUrls([postToReturn]);
    }

    return postToReturn;
  }
}
