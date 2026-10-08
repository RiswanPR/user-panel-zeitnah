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
import { CreatePostDto, UpdatePostDto, ReactionDto, QuotePostDto } from '../dto/post.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityOwnershipGuard } from '../guards/community-ownership.guard';

@ApiTags('Community Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async createPost(@Req() req, @Body() data: CreatePostDto) {
    const userId = this.getUserId(req);
    const isAdmin = req.user?.role === 'admin';
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      data.idempotencyKey;
    return this.postService.createPost(userId, data, isAdmin, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: 'Get community feed' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'filter', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'organizationId', required: false })
  async getFeed(
    @Req() req,
    @Query('limit') limit: number,
    @Query('cursor') cursor: string,
    @Query('filter') filter: string,
    @Query('search') search: string,
    @Query('tag') tag: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const userId = this.getUserId(req);
    const courseIds = (req.user?.enrolledCourses || []).map((c: any) => c.courseId || c._id || c);
    return this.postService.getFeed(
      userId,
      courseIds,
      limit ? Number(limit) : 10,
      cursor,
      filter,
      search,
      tag,
      organizationId,
    );
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved posts for current user' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  async getSavedPosts(
    @Req() req,
    @Query('limit') limit: number,
    @Query('cursor') cursor: string,
  ) {
    const userId = this.getUserId(req);
    const courseIds = (req.user?.enrolledCourses || []).map((c: any) => c.courseId || c._id || c);
    return this.postService.getSavedPosts(
      userId,
      courseIds,
      limit ? Number(limit) : 10,
      cursor,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search community posts, people, and topics' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'posts', 'people', 'topics'] })
  @ApiQuery({ name: 'limit', required: false })
  async searchCommunity(
    @Req() req,
    @Query('q') q: string,
    @Query('type') type: 'all' | 'posts' | 'people' | 'topics' = 'all',
    @Query('limit') limit: number = 10,
  ) {
    const userId = this.getUserId(req);
    const courseIds = (req.user?.enrolledCourses || []).map((c: any) => c.courseId || c._id || c);
    return this.postService.searchCommunity(userId, courseIds, {
      q,
      type,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get('creator/insights')
  @ApiOperation({ summary: 'Get creator activity and engagement insights' })
  async getCreatorInsights(@Req() req) {
    const userId = this.getUserId(req);
    return this.postService.getCreatorInsights(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID' })
  async getPost(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.postService.getPostById(id, userId);
  }

  @Patch(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Update a post' })
  async updatePost(
    @Req() req,
    @Param('id') id: string,
    @Body() data: UpdatePostDto,
  ) {
    const userId = this.getUserId(req);
    return this.postService.updatePost(
      id,
      userId,
      req.user?.role || 'student',
      data,
    );
  }

  @Delete(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Delete a post' })
  async deletePost(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const deleted = await this.postService.deletePost(
      id,
      userId,
      req.user?.role || 'student',
    );
    return { success: deleted, message: 'Post deleted successfully' };
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add or toggle reaction to a post' })
  async addReaction(
    @Req() req,
    @Param('id') id: string,
    @Body() data: ReactionDto,
  ) {
    const userId = this.getUserId(req);
    const result = await this.postService.addReaction(
      id,
      userId,
      data.type || 'like',
    );
    return { success: true, ...result };
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a post' })
  async removeReaction(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const result = await this.postService.removeReaction(id, userId);
    return { success: true, ...result };
  }

  @Post(':id/bookmarks')
  @ApiOperation({ summary: 'Save/bookmark a post' })
  async savePost(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const result = await this.postService.savePost(id, userId);
    return { success: true, ...result, message: 'Post saved' };
  }

  @Delete(':id/bookmarks')
  @ApiOperation({ summary: 'Remove saved/bookmarked post' })
  async removeSavedPost(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const result = await this.postService.removeSavedPost(id, userId);
    return { success: true, ...result, message: 'Post removed from saved' };
  }

  @Post(':id/repost')
  @ApiOperation({ summary: 'Repost a community post' })
  async repostPost(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const courseIds = (req.user?.enrolledCourses || []).map((c: any) => c.courseId || c._id || c);
    const role = req.user?.role || 'student';
    return this.postService.repostPost(id, userId, courseIds, role);
  }

  @Delete(':id/repost')
  @ApiOperation({ summary: 'Remove a repost' })
  async unrepostPost(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.postService.unrepostPost(id, userId);
  }

  @Post(':id/quote')
  @ApiOperation({ summary: 'Quote a community post' })
  async quotePost(
    @Req() req,
    @Param('id') id: string,
    @Body() data: QuotePostDto,
  ) {
    const userId = this.getUserId(req);
    const courseIds = (req.user?.enrolledCourses || []).map((c: any) => c.courseId || c._id || c);
    const role = req.user?.role || 'student';
    return this.postService.quotePost(id, userId, data, courseIds, role);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Record a meaningful view on a community post / video' })
  async recordPostView(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.postService.recordPostView(id, userId);
  }
}
