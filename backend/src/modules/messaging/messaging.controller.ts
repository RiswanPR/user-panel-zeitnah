import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  SendMessageDto,
  EditMessageDto,
  AddReactionDto,
  QueryConversationsDto,
  QueryMessagesDto,
  QuerySavedMessagesDto,
  SearchMessagingDto,
  MuteConversationDto,
  ArchiveConversationDto,
  ReportConversationDto,
} from './dto/messaging.dto';

interface AuthenticatedRequest {
  user?: {
    userId?: string;
    _id?: string;
    id?: string;
    role?: string;
  };
}

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  private getUserId(req: AuthenticatedRequest): string {
    const id = req.user?.userId || req.user?._id || req.user?.id;
    return String(id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations by tab' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getConversations(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryConversationsDto,
  ) {
    return this.messagingService.getConversations(this.getUserId(req), query);
  }

  @Get('conversations/unread-counts')
  @ApiOperation({ summary: 'Get total unread messages and requests count' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getUnreadCounts(@Req() req: AuthenticatedRequest) {
    return this.messagingService.getUnreadCounts(this.getUserId(req));
  }

  @Get('search')
  @ApiOperation({ summary: 'Global search across accessible conversations' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async searchMessages(
    @Req() req: AuthenticatedRequest,
    @Query() query: SearchMessagingDto,
  ) {
    return this.messagingService.searchMessages(this.getUserId(req), query);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get user saved messages' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getSavedMessages(
    @Req() req: AuthenticatedRequest,
    @Query() query: QuerySavedMessagesDto,
  ) {
    return this.messagingService.getSavedMessages(this.getUserId(req), query);
  }

  @Post('saved/:messageId')
  @ApiOperation({ summary: 'Save a message' })
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  async saveMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.saveMessage(this.getUserId(req), messageId);
  }

  @Delete('saved/:messageId')
  @ApiOperation({ summary: 'Unsave a message' })
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  async unsaveMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.unsaveMessage(this.getUserId(req), messageId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get single conversation by ID' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.messagingService.getConversationById(this.getUserId(req), id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start direct conversation or message request' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async startDirectConversation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.messagingService.startDirectConversation(
      this.getUserId(req),
      dto,
    );
  }

  @Post('conversations/group')
  @ApiOperation({ summary: 'Create group conversation' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createGroup(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.messagingService.createGroupConversation(
      this.getUserId(req),
      dto,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in conversation (cursor-paginated)' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagingService.getMessages(this.getUserId(req), id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message in conversation' })
  @Throttle({ default: { limit: 45, ttl: 60000 } })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(this.getUserId(req), id, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation read' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.messagingService.markConversationRead(this.getUserId(req), id);
  }

  @Get('conversations/:id/pinned')
  @ApiOperation({ summary: 'Get pinned messages in conversation' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getPinnedMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.messagingService.getPinnedMessages(this.getUserId(req), id);
  }

  @Post('conversations/:id/pin/:messageId')
  @ApiOperation({ summary: 'Pin message in conversation' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async pinMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.pinMessage(this.getUserId(req), id, messageId);
  }

  @Delete('conversations/:id/pin/:messageId')
  @ApiOperation({ summary: 'Unpin message in conversation' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async unpinMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.unpinMessage(this.getUserId(req), id, messageId);
  }

  @Post('conversations/:id/request/accept')
  @ApiOperation({ summary: 'Accept message request' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.messagingService.acceptMessageRequest(this.getUserId(req), id);
  }

  @Post('conversations/:id/request/decline')
  @ApiOperation({ summary: 'Decline message request' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async declineRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.messagingService.declineMessageRequest(this.getUserId(req), id);
  }

  @Patch('conversations/:id/mute')
  @ApiOperation({ summary: 'Mute / unmute conversation' })
  async muteConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: MuteConversationDto,
  ) {
    return this.messagingService.muteConversation(this.getUserId(req), id, dto);
  }

  @Patch('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive / unarchive conversation' })
  async archiveConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ArchiveConversationDto,
  ) {
    return this.messagingService.archiveConversation(
      this.getUserId(req),
      id,
      dto,
    );
  }

  @Post('conversations/:id/report')
  @ApiOperation({ summary: 'Report conversation to moderation' })
  async reportConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReportConversationDto,
  ) {
    return this.messagingService.reportConversation(
      this.getUserId(req),
      id,
      dto,
    );
  }

  @Post('conversations/:id/leave')
  @ApiOperation({ summary: 'Leave group conversation' })
  async leaveGroup(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.messagingService.leaveGroup(this.getUserId(req), id);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Edit own recent message' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async editMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messagingService.editMessage(
      this.getUserId(req),
      messageId,
      dto,
    );
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete message (for me or everyone)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async deleteMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Query('mode') mode: 'me' | 'everyone' = 'me',
  ) {
    return this.messagingService.deleteMessage(
      this.getUserId(req),
      messageId,
      mode,
    );
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Toggle reaction on message' })
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  async toggleReaction(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.messagingService.toggleReaction(
      this.getUserId(req),
      messageId,
      dto.emoji,
    );
  }

  @Post('messages/:messageId/report')
  @ApiOperation({ summary: 'Report message to moderation' })
  async reportMessage(
    @Req() req: AuthenticatedRequest,
    @Param('messageId') messageId: string,
    @Body() dto: ReportConversationDto,
  ) {
    return this.messagingService.reportMessage(
      this.getUserId(req),
      messageId,
      dto,
    );
  }

  @Post('attachments')
  @ApiOperation({ summary: 'Upload attachment for conversation message' })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  async uploadAttachment(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.messagingService.uploadAttachment(this.getUserId(req), file);
  }
}
