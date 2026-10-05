import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityMusicService } from '../services/community-music.service';

@ApiTags('Community Music')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/music')
export class CommunityMusicController {
  constructor(private readonly musicService: CommunityMusicService) {}

  @Get()
  @ApiOperation({ summary: 'Browse active music catalog with pagination' })
  @ApiQuery({ name: 'category', required: false, description: 'Category filter (e.g. UPBEAT, CHILL, FOCUS)' })
  @ApiQuery({ name: 'mood', required: false, description: 'Mood filter' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of tracks to return (default: 20)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor timestamp for pagination' })
  @ApiQuery({ name: 'skip', required: false, description: 'Offset for pagination' })
  async getCatalog(
    @Query('category') category?: string,
    @Query('mood') mood?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
    @Query('skip') skip?: number,
  ) {
    return this.musicService.getCatalog({
      category,
      mood,
      limit: limit ? Number(limit) : undefined,
      cursor,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search active music catalog by title, artist, or tags' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query string' })
  @ApiQuery({ name: 'category', required: false, description: 'Category filter' })
  @ApiQuery({ name: 'mood', required: false, description: 'Mood filter' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 20)' })
  async searchMusic(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('mood') mood?: string,
    @Query('limit') limit?: number,
  ) {
    return this.musicService.searchMusic({
      q,
      category,
      mood,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single active music track' })
  @ApiParam({ name: 'id', description: 'Music track ID' })
  async getTrack(@Param('id') id: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Track ID is required');
    }
    return this.musicService.getTrackById(id);
  }
}
