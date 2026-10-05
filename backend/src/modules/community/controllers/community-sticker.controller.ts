import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityStickerService } from '../services/community-sticker.service';

@ApiTags('Community Stickers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/stickers')
export class CommunityStickerController {
  constructor(private readonly stickerService: CommunityStickerService) {}

  @Get()
  @ApiOperation({ summary: 'Get curated sticker catalog' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by sticker category' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of stickers to return' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination' })
  async getStickers(
    @Query('category') category?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.stickerService.getStickerCatalog({ category, limit, cursor });
  }
}
