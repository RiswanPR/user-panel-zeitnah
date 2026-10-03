import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryService } from '../services/story.service';
import { CreateStoryDto, StoryReplyDto } from '../dto/story.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityOwnershipGuard } from '../guards/community-ownership.guard';
import { NotificationsService } from '../../notifications/notifications.service';

@ApiTags('Community Stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/stories')
export class StoryController {
  constructor(
    private readonly storyService: StoryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
  }

  @Post()
  @ApiOperation({ summary: 'Upload a new story' })
  async createStory(@Req() req, @Body() data: CreateStoryDto) {
    const userId = this.getUserId(req);
    const isAdmin = req.user?.role === 'admin';
    return this.storyService.createStory(userId, data, isAdmin);
  }

  @Get()
  @ApiOperation({ summary: 'Get active stories feed' })
  async getActiveFeed() {
    return this.storyService.getActiveFeed();
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark story as seen' })
  async trackView(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    await this.storyService.trackView(id, userId);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Delete a story' })
  async deleteStory(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const deleted = await this.storyService.deleteStory(
      id,
      userId,
      req.user?.role || 'student',
    );
    return { success: deleted, message: 'Story deleted successfully' };
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a story' })
  async replyToStory(
    @Req() req,
    @Param('id') id: string,
    @Body() data: StoryReplyDto,
  ) {
    const userId = this.getUserId(req);
    const story = await this.storyService.getStoryById(id);
    if (!story) throw new NotFoundException('Story not found');

    if (story.authorId && String(story.authorId) !== String(userId)) {
      try {
        await this.notificationsService.createNotification({
          recipientId: story.authorId,
          actorId: userId,
          type: 'COMMUNITY_STORY_REPLY',
          category: 'community',
          priority: 'NORMAL',
          title: 'Reply to your story',
          message: data.content || 'Someone replied to your story',
          actionUrl: '/community',
          targetUrl: '/community',
        });
      } catch (e) {
        // best-effort
      }
    }
    return { success: true, message: 'Reply sent' };
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'React to a story' })
  async reactToStory(
    @Req() req,
    @Param('id') id: string,
    @Body() data: { type: string },
  ) {
    const userId = this.getUserId(req);
    const story = await this.storyService.getStoryById(id);
    if (!story) throw new NotFoundException('Story not found');

    if (story.authorId && String(story.authorId) !== String(userId)) {
      try {
        await this.notificationsService.createNotification({
          recipientId: story.authorId,
          actorId: userId,
          type: 'COMMUNITY_STORY_REACTION',
          category: 'community',
          priority: 'NORMAL',
          title: 'Reaction to your story',
          message: 'Someone reacted to your story',
          actionUrl: '/community',
          targetUrl: '/community',
        });
      } catch (e) {
        // best-effort
      }
    }
    return { success: true, message: 'Reaction added' };
  }
}
