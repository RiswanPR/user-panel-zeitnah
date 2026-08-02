import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../profile/decorators/current-user.decorator';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { PresenceService } from './services/presence.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { ReactMessageDto } from './dto/react-message.dto';
import { PinMessageDto } from './dto/pin-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';

@ApiTags('Community Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/messages')
export class MessagingController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly presenceService: PresenceService,
  ) {}

  // ----------------------------------------------------
  // CONVERSATIONS
  // ----------------------------------------------------

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get existing direct conversation with a target user' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.createDirectConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get list of conversations for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUserConversations(
    @CurrentUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.conversationService.getUserConversations(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get details of a specific conversation' })
  async getConversationById(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.conversationService.getConversationById(conversationId, userId);
  }

  // ----------------------------------------------------
  // MESSAGES, CURSOR PAGINATION & SEARCH
  // ----------------------------------------------------

  @Get('cursor')
  @ApiOperation({ summary: 'Enterprise cursor-based message pagination' })
  @ApiQuery({ name: 'conversationId', required: true })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMessagesByCursor(
    @CurrentUser('id') userId: string,
    @Query('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit: string = '50',
  ) {
    return this.messageService.getMessagesByCursor(
      conversationId,
      userId,
      cursor,
      parseInt(limit, 10),
    );
  }

  @Get('global-search')
  @ApiOperation({ summary: 'Global cross-conversation message search' })
  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'type', required: false })
  async globalSearchMessages(
    @CurrentUser('id') userId: string,
    @Query('query') query: string,
    @Query('type') type?: string,
  ) {
    return this.messageService.globalSearchMessages(userId, query, type);
  }

  @Get('gallery/:conversationId')
  @ApiOperation({ summary: 'Get shared media gallery for a conversation' })
  @ApiQuery({ name: 'type', required: false })
  async getSharedMediaGallery(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('type') type?: string,
  ) {
    return this.messageService.getSharedMediaGallery(
      conversationId,
      userId,
      type,
    );
  }

  @Get('analytics/:conversationId')
  @ApiOperation({ summary: 'Get analytics summary for a conversation' })
  async getConversationAnalytics(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messageService.getConversationAnalytics(conversationId, userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search message content inside a conversation' })
  @ApiQuery({ name: 'conversationId', required: true })
  @ApiQuery({ name: 'query', required: true })
  async searchMessages(
    @CurrentUser('id') userId: string,
    @Query('conversationId') conversationId: string,
    @Query('query') query: string,
  ) {
    return this.messageService.searchMessages(userId, conversationId, query);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages history for a conversation' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMessagesByConversation(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.messageService.getMessagesByConversation(
      conversationId,
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(userId, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload file / media asset for messaging to S3' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMessagingFile(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.messageService.uploadMessagingFile(userId, file);
  }

  @Post('reactions')
  @ApiOperation({ summary: 'React to a message with an emoji' })
  async reactMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.messageService.reactToMessage(userId, dto.messageId, dto.emoji);
  }

  @Post('pin')
  @ApiOperation({ summary: 'Pin or unpin a message' })
  async pinMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: PinMessageDto,
  ) {
    return this.messageService.pinMessage(userId, dto.messageId);
  }

  @Post('forward')
  @ApiOperation({ summary: 'Forward a message to another conversation' })
  async forwardMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: ForwardMessageDto,
  ) {
    return this.messageService.forwardMessage(
      userId,
      dto.messageId,
      dto.targetConversationId,
    );
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit content of a sent message' })
  async editMessage(
    @CurrentUser('id') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messageService.editMessage(userId, messageId, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Soft delete a message' })
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messageService.softDeleteMessage(userId, messageId);
  }

  // ----------------------------------------------------
  // READ RECEIPTS & PRESENCE
  // ----------------------------------------------------

  @Post('read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.messageService.markRead(userId, dto);
  }

  @Get('presences/:userId')
  @ApiOperation({ summary: 'Get user presence and last seen status' })
  async getUserPresence(@Param('userId') targetUserId: string) {
    return this.presenceService.getPresence(targetUserId);
  }
}
