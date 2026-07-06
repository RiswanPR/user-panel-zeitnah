import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards, Req, Put } from '@nestjs/common';
import { PostService } from '../services/post.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('community/posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  async createPost(@Req() req, @Body() body: any) {
    const userId = req.user.id || req.user._id; // Depending on JWT payload strategy
    const post = await this.postService.createPost(userId, body);
    return { success: true, post };
  }

  @Get('feed')
  async getFeed(@Req() req, @Query('limit') limitStr: string, @Query('cursor') cursor?: string) {
    const userId = req.user.id || req.user._id;
    const limit = parseInt(limitStr, 10) || 10;
    
    // In a real implementation, you'd get courseIds from the user's enrollment data
    const courseIds = req.user.enrolledCourses || []; 
    
    const feed = await this.postService.getFeed(userId, courseIds, limit, cursor);
    return { success: true, ...feed };
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    const post = await this.postService.getPostById(id);
    if (!post) {
      return { success: false, message: 'Post not found' };
    }
    return { success: true, post };
  }

  @Delete(':id')
  async deletePost(@Req() req, @Param('id') id: string) {
    const userId = req.user.id || req.user._id;
    try {
      const deleted = await this.postService.deletePost(id, userId);
      return { success: deleted };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}
