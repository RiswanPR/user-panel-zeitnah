import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Message,
  MessageDocument,
  MessageType,
} from '../schemas/message.schema';
import {
  MessageRead,
  MessageReadDocument,
} from '../schemas/message-read.schema';
import { ConversationService } from './conversation.service';
import { UploadService } from '../../../../common/aws/upload.service';
import { RedisService } from '../../../redis/redis.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { EditMessageDto } from '../dto/edit-message.dto';
import { MarkReadDto } from '../dto/mark-read.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(MessageRead.name)
    private readonly messageReadModel: Model<MessageReadDocument>,
    private readonly conversationService: ConversationService,
    private readonly uploadService: UploadService,
    private readonly redisService: RedisService,
  ) {}

  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageDocument> {
    const {
      conversationId,
      content,
      type = MessageType.TEXT,
      replyTo,
      mediaUrl,
      fileName,
      fileSize,
      codeLanguage,
      sharedMetadata,
    } = dto;

    // Rate Limiting Check (Max 30 messages per minute per user)
    const rateKey = `msg:ratelimit:${senderId}`;
    const currentCountStr = await this.redisService.get(rateKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    if (currentCount >= 30) {
      throw new BadRequestException(
        'Rate limit exceeded: Maximum 30 messages per minute allowed',
      );
    }
    await this.redisService.set(rateKey, (currentCount + 1).toString(), 60);

    if (
      type === MessageType.TEXT &&
      (!content || content.trim().length === 0)
    ) {
      throw new BadRequestException('Empty text messages are rejected');
    }

    // Verify conversation access
    await this.conversationService.getConversationById(
      conversationId,
      senderId,
    );

    const message = await this.messageModel.create({
      conversationId,
      senderId,
      type,
      content: content ? content.trim() : `Sent ${type.toLowerCase()}`,
      replyTo: replyTo || null,
      mediaUrl: mediaUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      codeLanguage: codeLanguage || '',
      sharedMetadata: sharedMetadata || {},
    });

    const preview =
      type === MessageType.TEXT
        ? message.content
        : `[${type.toUpperCase()}] ${fileName || message.content}`;

    await this.conversationService.updateLastMessage(
      conversationId,
      message._id,
      preview,
    );

    await this.messageReadModel
      .create({
        messageId: message._id,
        userId: senderId,
      })
      .catch(() => {});

    return message;
  }

  // ----------------------------------------------------
  // CURSOR PAGINATION (ENTERPRISE SCALABILITY)
  // ----------------------------------------------------
  async getMessagesByCursor(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<{ messages: MessageDocument[]; nextCursor: string | null }> {
    await this.conversationService.getConversationById(conversationId, userId);

    const query: any = { conversationId, deleted: false };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem ? nextItem._id : null;
    }

    return {
      messages: messages.reverse(),
      nextCursor,
    };
  }

  // ----------------------------------------------------
  // SHARED MEDIA GALLERY
  // ----------------------------------------------------
  async getSharedMediaGallery(
    conversationId: string,
    userId: string,
    type?: string,
  ): Promise<MessageDocument[]> {
    await this.conversationService.getConversationById(conversationId, userId);

    const filter: any = { conversationId, deleted: false };

    if (type === 'MEDIA') {
      filter.type = { $in: [MessageType.IMAGE, MessageType.VIDEO] };
    } else if (type === 'DOCS') {
      filter.type = { $in: [MessageType.PDF, MessageType.DOCUMENT] };
    } else if (type === 'AUDIO') {
      filter.type = MessageType.AUDIO;
    } else if (type === 'CODE') {
      filter.type = MessageType.CODE;
    } else if (type === 'RESOURCES') {
      filter.type = {
        $in: [MessageType.COURSE, MessageType.PROJECT, MessageType.PLACEMENT],
      };
    } else {
      filter.type = { $ne: MessageType.TEXT };
    }

    return this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  // ----------------------------------------------------
  // CONVERSATION ANALYTICS
  // ----------------------------------------------------
  async getConversationAnalytics(
    conversationId: string,
    userId: string,
  ): Promise<{
    totalMessages: number;
    mediaCount: number;
    docsCount: number;
    codeSnippetsCount: number;
    activeParticipantsCount: number;
  }> {
    const conversation = await this.conversationService.getConversationById(
      conversationId,
      userId,
    );

    const [totalMessages, mediaCount, docsCount, codeSnippetsCount] =
      await Promise.all([
        this.messageModel.countDocuments({ conversationId, deleted: false }),
        this.messageModel.countDocuments({
          conversationId,
          deleted: false,
          type: { $in: [MessageType.IMAGE, MessageType.VIDEO] },
        }),
        this.messageModel.countDocuments({
          conversationId,
          deleted: false,
          type: { $in: [MessageType.PDF, MessageType.DOCUMENT] },
        }),
        this.messageModel.countDocuments({
          conversationId,
          deleted: false,
          type: MessageType.CODE,
        }),
      ]);

    return {
      totalMessages,
      mediaCount,
      docsCount,
      codeSnippetsCount,
      activeParticipantsCount: conversation.participants.length,
    };
  }

  // ----------------------------------------------------
  // GLOBAL CROSS-CONVERSATION SEARCH
  // ----------------------------------------------------
  async globalSearchMessages(
    userId: string,
    query: string,
    type?: string,
  ): Promise<MessageDocument[]> {
    if (!query || query.trim().length === 0) return [];

    const userConvs = await this.conversationService.getUserConversations(
      userId,
      1,
      100,
    );

    const convIds = userConvs.conversations.map((c) => c._id);

    const filter: any = {
      conversationId: { $in: convIds },
      deleted: false,
      content: { $regex: new RegExp(query.trim(), 'i') },
    };

    if (type) {
      filter.type = type;
    }

    return this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async uploadMessagingFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{
    mediaUrl: string;
    fileName: string;
    fileSize: number;
    type: MessageType;
  }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds maximum limit of 50MB');
    }

    let type = MessageType.DOCUMENT;
    if (file.mimetype.startsWith('image/')) type = MessageType.IMAGE;
    else if (file.mimetype.startsWith('video/')) type = MessageType.VIDEO;
    else if (file.mimetype.startsWith('audio/')) type = MessageType.AUDIO;
    else if (file.mimetype === 'application/pdf') type = MessageType.PDF;

    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `community/messages/${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const uploadedKey = await this.uploadService.uploadFile(
      key,
      file.buffer,
      file.mimetype,
    );

    const bucket = process.env.AWS_S3_BUCKET || 'lms-bucket';
    const region = process.env.AWS_REGION || 'us-east-1';
    const mediaUrl = `https://${bucket}.s3.${region}.amazonaws.com/${uploadedKey}`;

    return {
      mediaUrl,
      fileName: file.originalname,
      fileSize: file.size,
      type,
    };
  }

  async reactToMessage(
    userId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findOne({ _id: messageId } as any);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.conversationService.getConversationById(
      message.conversationId,
      userId,
    );

    const existingIndex = message.reactions.findIndex(
      (r) => r.userId === userId && r.emoji === emoji,
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ userId, emoji });
    }

    return message.save();
  }

  async pinMessage(
    userId: string,
    messageId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findOne({ _id: messageId } as any);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.conversationService.getConversationById(
      message.conversationId,
      userId,
    );

    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? userId : null;
    message.pinnedAt = message.isPinned ? new Date() : null;

    return message.save();
  }

  async forwardMessage(
    senderId: string,
    messageId: string,
    targetConversationId: string,
  ): Promise<MessageDocument> {
    const originalMessage = await this.messageModel.findOne({
      _id: messageId,
    } as any);
    if (!originalMessage) {
      throw new NotFoundException('Original message not found');
    }

    await this.conversationService.getConversationById(
      targetConversationId,
      senderId,
    );

    const forwardedMessage = await this.messageModel.create({
      conversationId: targetConversationId,
      senderId,
      type: originalMessage.type,
      content: originalMessage.content,
      mediaUrl: originalMessage.mediaUrl,
      fileName: originalMessage.fileName,
      fileSize: originalMessage.fileSize,
      codeLanguage: originalMessage.codeLanguage,
      sharedMetadata: originalMessage.sharedMetadata,
    });

    await this.conversationService.updateLastMessage(
      targetConversationId,
      forwardedMessage._id,
      `[FORWARDED] ${forwardedMessage.content}`,
    );

    return forwardedMessage;
  }

  async searchMessages(
    userId: string,
    conversationId: string,
    query: string,
  ): Promise<MessageDocument[]> {
    await this.conversationService.getConversationById(conversationId, userId);

    if (!query || query.trim().length === 0) return [];

    return this.messageModel
      .find({
        conversationId,
        deleted: false,
        content: { $regex: new RegExp(query.trim(), 'i') },
      })
      .sort({ createdAt: -1 })
      .limit(30)
      .exec();
  }

  async getMessagesByConversation(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: MessageDocument[]; total: number }> {
    await this.conversationService.getConversationById(conversationId, userId);

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversationId, deleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({ conversationId, deleted: false }),
    ]);

    return { messages: messages.reverse(), total };
  }

  async editMessage(
    senderId: string,
    messageId: string,
    dto: EditMessageDto,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findOne({ _id: messageId } as any);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.deleted) {
      throw new BadRequestException('Cannot edit deleted message');
    }

    if (message.senderId !== senderId) {
      throw new ForbiddenException(
        'Access denied: You can only edit your own messages',
      );
    }

    message.content = dto.content.trim();
    message.edited = true;
    return message.save();
  }

  async softDeleteMessage(
    senderId: string,
    messageId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findOne({ _id: messageId } as any);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== senderId) {
      throw new ForbiddenException(
        'Access denied: You can only delete your own messages',
      );
    }

    message.deleted = true;
    message.content = '[This message was deleted]';
    return message.save();
  }

  async markRead(
    userId: string,
    dto: MarkReadDto,
  ): Promise<{ success: boolean }> {
    const { conversationId, messageId } = dto;

    await this.conversationService.getConversationById(conversationId, userId);

    if (messageId) {
      await this.messageReadModel.updateOne(
        { messageId, userId },
        { $setOnInsert: { messageId, userId, seenAt: new Date() } },
        { upsert: true },
      );
    } else {
      const unreadMessages = await this.messageModel.find({
        conversationId,
        senderId: { $ne: userId },
      });

      const bulkOps = unreadMessages.map((msg) => ({
        updateOne: {
          filter: { messageId: msg._id, userId },
          update: {
            $setOnInsert: { messageId: msg._id, userId, seenAt: new Date() },
          },
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        await this.messageReadModel.bulkWrite(bulkOps);
      }
    }

    return { success: true };
  }
}
