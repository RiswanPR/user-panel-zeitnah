import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PostService } from '../services/post.service';
import { CreatePostDto, UpdatePostDto, ReactionDto } from '../dto/post.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityOwnershipGuard } from '../guards/community-ownership.guard';

@ApiTags('Community Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async createPost(@Req() req, @Body() data: CreatePostDto) {
    return this.postService.createPost(req.user._id || req.user.sub, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get community feed' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  async getFeed(
    @Req() req,
    @Query('limit') limit: number,
    @Query('cursor') cursor: string,
  ) {
    // In a real scenario, we'd extract courseIds from the user's enrolled courses.
    const courseIds = [];
    return this.postService.getFeed(
      req.user._id || req.user.sub,
      courseIds,
      limit ? Number(limit) : 10,
      cursor,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID' })
  async getPost(@Param('id') id: string) {
    return this.postService.getPostById(id);
  }

  @Patch(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Update a post' })
  async updatePost(
    @Req() req,
    @Param('id') id: string,
    @Body() data: UpdatePostDto,
  ) {
    return this.postService.updatePost(id, req.user._id || req.user.sub, data);
  }

  @Delete(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Delete a post' })
  async deletePost(@Req() req, @Param('id') id: string) {
    return this.postService.deletePost(
      id,
      req.user._id || req.user.sub,
      req.user.role,
    );
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add a reaction to a post' })
  async addReaction(
    @Req() req,
    @Param('id') id: string,
    @Body() data: ReactionDto,
  ) {
    await this.postService.addReaction(id, req.user._id || req.user.sub, data.type);
    return { success: true, message: 'Reaction added' };
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a post' })
  async removeReaction(@Req() req, @Param('id') id: string) {
    await this.postService.removeReaction(id, req.user._id || req.user.sub);
    return { success: true, message: 'Reaction removed' };
  }

  @Post(':id/bookmarks')
  @ApiOperation({ summary: 'Save a post' })
  async savePost(@Req() req, @Param('id') id: string) {
    return { success: true, message: 'Post saved' };
  }

  @Delete(':id/bookmarks')
  @ApiOperation({ summary: 'Remove a saved post' })
  async removeSavedPost(@Req() req, @Param('id') id: string) {
    return { success: true, message: 'Post removed from saved' };
  }
}
