import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityMediaJobService } from '../services/community-media-job.service';
import { CommunityMusicService } from '../services/community-music.service';

@ApiTags('Community Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/media')
export class CommunityMediaController {
  constructor(
    private readonly jobService: CommunityMediaJobService,
    @Optional() private readonly musicService?: CommunityMusicService,
  ) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
  }

  @Get(':mediaId/status')
  @ApiOperation({ summary: 'Get video processing status and playback details' })
  @ApiParam({ name: 'mediaId', description: 'Unique media identifier' })
  async getMediaStatus(@Param('mediaId') mediaId: string, @Req() req: any) {
    if (!mediaId || typeof mediaId !== 'string') {
      throw new BadRequestException('Valid media ID is required');
    }

    const userId = this.getUserId(req);
    const isAdmin = req.user?.role === 'admin';

    return this.jobService.getJobStatus(mediaId, userId, isAdmin);
  }

  @Post(':mediaId/retry')
  @ApiOperation({ summary: 'Retry failed media processing using the stored source asset' })
  @ApiParam({ name: 'mediaId', description: 'Unique media identifier' })
  async retryMediaProcessing(
    @Param('mediaId') mediaId: string,
    @Req() req: any,
    @Body() body?: any,
  ) {
    if (!mediaId || typeof mediaId !== 'string') {
      throw new BadRequestException('Valid media ID is required');
    }

    const userId = this.getUserId(req);
    const isAdmin = req.user?.role === 'admin';
    const effectiveBody = body || req?.body || {};

    let resolvedAudioConfig = effectiveBody?.audioConfig;
    if (resolvedAudioConfig && this.musicService) {
      resolvedAudioConfig = await this.musicService.validateAndResolveAudioConfig(
        resolvedAudioConfig,
        req?.user?.username,
      );
    }

    const job = await this.jobService.retryJob(mediaId, userId, isAdmin, {
      trimStart: effectiveBody?.trimStart !== undefined ? Number(effectiveBody.trimStart) : undefined,
      trimEnd: effectiveBody?.trimEnd !== undefined ? Number(effectiveBody.trimEnd) : undefined,
      audioConfig: resolvedAudioConfig,
      editorConfig: effectiveBody?.editorConfig,
    });
    return {
      mediaId: job.mediaId,
      status: job.status,
      message: 'Video processing retry initiated.',
    };
  }
}
