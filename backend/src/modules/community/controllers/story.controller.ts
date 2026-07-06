import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryService } from '../services/story.service';
import { CreateStoryDto, StoryReplyDto } from '../dto/story.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityOwnershipGuard } from '../guards/community-ownership.guard';

import { NotificationService } from '../services/notification.service';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Community Stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/stories')
export class StoryController {
  constructor(
    private readonly storyService: StoryService,
    private readonly notificationService: NotificationService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload a new story' })
  async createStory(@Req() req, @Body() data: CreateStoryDto) {
    return this.storyService.createStory(req.user._id || req.user.sub, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get active stories feed' })
  async getActiveFeed() {
    return this.storyService.getActiveFeed();
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark story as seen' })
  async trackView(@Req() req, @Param('id') id: string) {
    await this.storyService.trackView(id, req.user._id || req.user.sub);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Delete a story' })
  async deleteStory(@Req() req, @Param('id') id: string) {
    return this.storyService.deleteStory(
      id,
      req.user._id || req.user.sub,
      req.user.role,
    );
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a story' })
  async replyToStory(
    @Req() req,
    @Param('id') id: string,
    @Body() data: StoryReplyDto,
  ) {
    const story = await this.storyService.getStoryById(id);
    if (!story) throw new NotFoundException('Story not found');
    
    await this.notificationService.createNotification(
      story.authorId,
      req.user._id || req.user.sub,
      'story_reply',
      id,
      'story',
      data.content
    );
    return { success: true, message: 'Reply sent' };
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'React to a story' })
  async reactToStory(
    @Req() req,
    @Param('id') id: string,
    @Body() data: { type: string },
  ) {
    const story = await this.storyService.getStoryById(id);
    if (!story) throw new NotFoundException('Story not found');
    
    await this.notificationService.createNotification(
      story.authorId,
      req.user._id || req.user.sub,
      'story_reaction',
      id,
      'story',
      data.type
    );
    return { success: true, message: 'Reaction added' };
  }
}
