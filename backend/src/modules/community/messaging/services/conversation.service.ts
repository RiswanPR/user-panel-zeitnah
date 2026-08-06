import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from '../schemas/conversation.schema';
import { CreateConversationDto } from '../dto/create-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  async createDirectConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    const { targetUserId } = dto;

    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        'Cannot start a direct conversation with yourself',
      );
    }

    // Check if direct conversation already exists between these 2 users
    const existing = await this.conversationModel.findOne({
      type: ConversationType.DIRECT,
      participants: { $all: [currentUserId, targetUserId] },
    });

    if (existing) {
      return existing;
    }

    return this.conversationModel.create({
      type: ConversationType.DIRECT,
      participants: [currentUserId, targetUserId],
      createdBy: currentUserId,
      lastActivity: new Date(),
    });
  }

  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ conversations: ConversationDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find({ participants: userId, isArchived: false })
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments({
        participants: userId,
        isArchived: false,
      }),
    ]);

    return { conversations, total };
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
    } as any);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      throw new ForbiddenException(
        'Access denied: You are not a participant in this conversation',
      );
    }

    return conversation;
  }

  async updateLastMessage(
    conversationId: string,
    messageId: string,
    preview: string,
  ): Promise<void> {
    await this.conversationModel.updateOne({ _id: conversationId } as any, {
      $set: {
        lastMessageId: messageId,
        lastMessagePreview: preview.substring(0, 100),
        lastActivity: new Date(),
      },
    });
  }
}
