import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityAIService } from '../services/community-ai.service';

@Controller('community/ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: CommunityAIService) {}

  @Post('improve')
  async improveText(@Body('text') text: string) {
    const improved = await this.aiService.improveText(text);
    return { improved };
  }

  @Post('suggest-tags')
  async suggestTags(@Body('text') text: string) {
    const tags = await this.aiService.suggestTags(text);
    return { tags };
  }
}
