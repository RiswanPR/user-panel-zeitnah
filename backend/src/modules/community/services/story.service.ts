import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoryRepository } from '../repositories/mongo-story.repository';
import { CreateStoryDto, StoryReplyDto } from '../dto/story.dto';
import { StoryDocument } from '../schemas/story.schema';
import { CommunityGateway } from '../gateways/community.gateway';

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor(
    private readonly storyRepository: StoryRepository,
    private readonly communityGateway: CommunityGateway,
  ) {}

  async createStory(
    userId: string,
    data: CreateStoryDto,
  ): Promise<StoryDocument> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const createdStory = await this.storyRepository.create({
      authorId: userId,
      type: data.type,
      text: data.text,
      backgroundColor: data.backgroundColor,
      link: data.link,
      courseTag: data.courseTag,
      expiresAt,
    });

    let media = null;
    if (data.mediaUrl) {
      media = await this.storyRepository.createMedia({
        storyId: createdStory._id,
        url: data.mediaUrl,
        type: data.mediaType || 'image',
        duration: data.mediaDuration,
      });
    }

    const storyToEmit = {
      ...createdStory.toObject(),
      media: media ? [media] : [],
    };

    this.communityGateway.emitStoryCreated(storyToEmit);

    return createdStory;
  }

  async getActiveFeed(): Promise<any[]> {
    return this.storyRepository.getActiveStories();
  }

  async trackView(storyId: string, userId: string): Promise<void> {
    await this.storyRepository.addView(storyId, userId);
  }

  async getStoryById(id: string): Promise<StoryDocument | null> {
    return this.storyRepository.findById(id);
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
