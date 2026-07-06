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

  @Post(':postId')
  @ApiOperation({ summary: 'Add a comment to a post' })
  async createComment(
    @Req() req,
    @Param('postId') postId: string,
    @Body() data: CreateCommentDto,
  ) {
    return this.commentService.createComment(
      req.user._id || req.user.sub,
      postId,
      data,
    );
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
      limit ? Number(limit) : 10,
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
    return this.commentService.updateComment(
      id,
      req.user._id || req.user.sub,
      data,
    );
  }

  @Delete(':id')
  @UseGuards(CommunityOwnershipGuard)
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Req() req, @Param('id') id: string) {
    return this.commentService.deleteComment(
      id,
      req.user._id || req.user.sub,
      req.user.role,
    );
  }
}
