import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Types } from 'mongoose';
import { StoryRepository } from '../repositories/mongo-story.repository';
import { CreateStoryDto } from '../dto/story.dto';
import { CommunityGateway } from '../gateways/community.gateway';
import { SignedUrlService } from '../../../common/aws/signed-url.service';
import { CommunityS3Service } from './community-s3.service';
import { CommunityIdempotencyService } from './community-idempotency.service';
import { OrganizationsService } from '../../organizations/organizations.service';

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);
  private readonly inFlightStoryRequests = new Map<string, Promise<any>>();

  constructor(
    private readonly storyRepository: StoryRepository,
    private readonly communityGateway: CommunityGateway,
    @Optional() private readonly signedUrlService?: SignedUrlService,
    @Optional() private readonly communityS3Service?: CommunityS3Service,
    @Optional() private readonly communityIdempotencyService?: CommunityIdempotencyService,
    @Optional() private readonly organizationsService?: OrganizationsService,
  ) {}

  private async resolveStoryMedia(
    story: any,
    avatarCache?: Map<string, string>,
  ): Promise<void> {
    if (!this.signedUrlService || !story) return;

    // Resolve array of media items in story.media
    if (Array.isArray(story.media)) {
      for (const m of story.media) {
        if (m?.url && (m.url.includes('.amazonaws.com') || !m.url.startsWith('http'))) {
          try {
            const cleanUrl = m.url.split('?')[0];
            const signed = await this.signedUrlService.generateSignedImageUrl(cleanUrl, 86400 * 7);
            if (signed) m.url = signed;
          } catch {}
        }
      }
    }

    // Resolve direct mediaUrl property if present
    if (
      typeof story.mediaUrl === 'string' &&
      (story.mediaUrl.includes('.amazonaws.com') || !story.mediaUrl.startsWith('http'))
    ) {
      try {
        const cleanUrl = story.mediaUrl.split('?')[0];
        const signed = await this.signedUrlService.generateSignedImageUrl(cleanUrl, 86400 * 7);
        if (signed) story.mediaUrl = signed;
      } catch {}
    }

    // Resolve author avatar if present and an S3 key or relative/unresolved S3 URL
    if (
      story.author?.avatar &&
      typeof story.author.avatar === 'string' &&
      (story.author.avatar.includes('.amazonaws.com') || !story.author.avatar.startsWith('http'))
    ) {
      try {
        const cleanAvatar = story.author.avatar.split('?')[0];
        if (avatarCache && avatarCache.has(cleanAvatar)) {
          story.author.avatar = avatarCache.get(cleanAvatar);
        } else {
          const signed = await this.signedUrlService.generateSignedImageUrl(cleanAvatar, 86400 * 7);
          if (signed) {
            story.author.avatar = signed;
            if (avatarCache) avatarCache.set(cleanAvatar, signed);
          }
        }
      } catch {}
    }
  }

  async createStory(
    userId: string,
    data: CreateStoryDto,
    isAdmin: boolean = false,
    idempotencyKey?: string,
  ): Promise<any> {
    const clientKey = idempotencyKey || (data as any)?.idempotencyKey;
    if (this.communityIdempotencyService && clientKey) {
      return this.communityIdempotencyService.executeWithIdempotency(
        userId,
        'CREATE_STORY',
        clientKey,
        data,
        () => this.executeStoryCreation(userId, data, isAdmin, clientKey),
      );
    }
    return this.executeStoryCreation(userId, data, isAdmin, clientKey);
  }

  private async executeStoryCreation(
    userId: string,
    data: CreateStoryDto,
    isAdmin: boolean = false,
    clientKey?: string,
  ): Promise<any> {
    const fingerprint = clientKey
      ? `${userId}:key:${clientKey}`
      : `${userId}:${data.text || ''}:${data.mediaUrl || ''}`;
    if (this.inFlightStoryRequests.has(fingerprint)) {
      return await this.inFlightStoryRequests.get(fingerprint);
    }

    const execution = async () => {
      let cleanMediaUrl: string | undefined = undefined;

      if (data.mediaUrl) {
        const rawUrl = data.mediaUrl.trim();
        if (!rawUrl) {
          throw new BadRequestException('Story media URL cannot be empty');
        }

        // Authoritative Media Ownership & Path Traversal Check (Sections 5, 6, 14)
        if (this.communityS3Service) {
          this.communityS3Service.validateMediaOwnership(rawUrl, userId, isAdmin);
        } else {
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

        cleanMediaUrl = rawUrl.split('?')[0];
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      if (data.organizationId) {
        if (this.organizationsService) {
          await this.organizationsService.validateCompanyPublishingAccess(userId, data.organizationId);
        } else if (!Types.ObjectId.isValid(data.organizationId)) {
          throw new BadRequestException('Invalid organization ID');
        }
      }

      const createdStory = await this.storyRepository.create({
        authorId: userId,
        type: data.type,
        text: data.text,
        backgroundColor: data.backgroundColor,
        link: data.link,
        courseTag: data.courseTag,
        expiresAt,
        organizationId: data.organizationId,
      });

      if (cleanMediaUrl) {
        await this.storyRepository.createMedia({
          storyId: createdStory._id,
          url: cleanMediaUrl,
          type: data.mediaType || 'image',
          duration: data.mediaDuration,
        });
      }

      const populatedStory = await this.storyRepository.findByIdPopulated(
        createdStory._id,
      );

      if (populatedStory) {
        this.communityGateway.emitStoryCreated(populatedStory);
      }

      const result = populatedStory || createdStory;
      if (result) {
        await this.resolveStoryMedia(result);
      }

      return result;
    };

    const promise = execution();
    this.inFlightStoryRequests.set(fingerprint, promise);
    try {
      return await promise;
    } finally {
      const timer = setTimeout(() => {
        this.inFlightStoryRequests.delete(fingerprint);
      }, 2000);
      timer.unref?.();
    }
  }

  async getActiveFeed(): Promise<any[]> {
    const stories = await this.storyRepository.getActiveStories();
    if (this.signedUrlService && Array.isArray(stories)) {
      const avatarCache = new Map<string, string>();
      for (const story of stories) {
        if (story) {
          await this.resolveStoryMedia(story, avatarCache);
        }
      }
    }
    return stories;
  }

  async trackView(storyId: string, userId: string): Promise<void> {
    await this.storyRepository.addView(storyId, userId);
  }

  async getStoryById(id: string): Promise<any> {
    const story = await this.storyRepository.findByIdPopulated(id);
    if (story) {
      await this.resolveStoryMedia(story);
    }
    return story;
  }

  async deleteStory(
    id: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const story = await this.storyRepository.findById(id);
    if (!story) throw new NotFoundException('Story not found');

    if (story.authorId !== userId && role !== 'admin') {
      throw new ForbiddenException('Unauthorized to delete this story');
    }

    return this.storyRepository.softDelete(id);
  }

  // CRON JOB for deleting expired stories automatically every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleStoryExpiry() {
    this.logger.log('Running story expiry cron job...');
    const deletedCount = await this.storyRepository.deleteExpiredStories();
    if (deletedCount > 0) {
      this.logger.log(`Expired ${deletedCount} stories.`);
    }
  }
}
