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
import { CommentService } from '../services/comment.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityOwnershipGuard } from '../guards/community-ownership.guard';

@ApiTags('Community Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
  }

  @Post(':postId')
  @ApiOperation({ summary: 'Add a comment to a post' })
  async createComment(
    @Req() req,
    @Param('postId') postId: string,
    @Body() data: CreateCommentDto,
  ) {
    const userId = this.getUserId(req);
    return this.commentService.createComment(userId, postId, data);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  async getComments(
    @Param('postId') postId: string,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
  ) {
    return this.commentService.getCommentsByPost(
      postId,
      limit ? Number(limit) : 20,
      skip ? Number(skip) : 0,
    );
  }

  @Patch(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Update a comment' })
  async updateComment(
    @Req() req,
    @Param('id') id: string,
    @Body() data: UpdateCommentDto,
  ) {
    const userId = this.getUserId(req);
    return this.commentService.updateComment(id, userId, data);
  }

  @Delete(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    const deleted = await this.commentService.deleteComment(
      id,
      userId,
      req.user?.role || 'student',
    );
    return { success: deleted, message: 'Comment deleted successfully' };
  }
}
