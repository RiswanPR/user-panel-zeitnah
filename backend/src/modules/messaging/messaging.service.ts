import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
  RequestStatus,
} from './schemas/conversation.schema';
import {
  Message,
  MessageDocument,
  MessageStatus,
} from './schemas/message.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  NetworkConnection,
  NetworkConnectionDocument,
} from '../network/schemas/connection.schema';
import { ModerationService } from '../moderation/moderation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagesGateway } from './messages.gateway';
import {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  SendMessageDto,
  EditMessageDto,
  QueryConversationsDto,
  QueryMessagesDto,
  MuteConversationDto,
  ArchiveConversationDto,
  ReportConversationDto,
} from './dto/messaging.dto';
import { ReportTargetType } from '../moderation/schemas/report.schema';

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(NetworkConnection.name)
    private readonly connectionModel: Model<NetworkConnectionDocument>,
    private readonly moderationService: ModerationService,
    private readonly messagesGateway: MessagesGateway,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CONVERSATIONS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start a direct conversation or send a message request
   */
  async startDirectConversation(
    callerId: string,
    dto: CreateDirectConversationDto,
  ) {
    if (callerId === dto.recipientId) {
      throw new BadRequestException('You cannot start a conversation with yourself.');
    }

    const callerObjId = this.toObjectId(callerId);
    const recipientObjId = this.toObjectId(dto.recipientId);

    // 1. Verify recipient exists
    const [callerUser, recipientUser] = await Promise.all([
      this.userModel.findById(callerObjId).lean(),
      this.userModel.findById(recipientObjId).lean(),
    ]);

    if (!recipientUser) {
      throw new NotFoundException('Recipient user not found.');
    }

    // 2. Safety & block check
    const isBlocked = await this.moderationService.hasBlockRelationship(
      callerId,
      dto.recipientId,
    );
    if (isBlocked) {
      throw new ForbiddenException(
        'You cannot message this user due to safety or privacy restrictions.',
      );
    }

    // 3. Check connection status between caller and recipient
    const connection = await this.connectionModel.findOne({
      $or: [
        { requesterId: callerObjId, recipientId: recipientObjId },
        { requesterId: recipientObjId, recipientId: callerObjId },
      ],
      status: 'accepted',
    });
    const isConnected = Boolean(connection);

    // 4. Check recipient messaging privacy settings
    const messagingPrivacy = recipientUser.privacySettings?.messaging || 'ANYONE';
    if (messagingPrivacy === 'NOBODY') {
      throw new ForbiddenException('This user does not accept direct messages.');
    }
    if (messagingPrivacy === 'CONNECTIONS_ONLY' && !isConnected) {
      throw new ForbiddenException(
        'This user only accepts messages from established connections.',
      );
    }

    // 5. Look for existing direct conversation between both users
    let conversation = await this.conversationModel.findOne({
      type: ConversationType.DIRECT,
      participants: { $all: [callerObjId, recipientObjId] },
    });

    const isMessageRequest = !isConnected;

    if (conversation) {
      // If it exists as a declined request from caller, reject
      if (
        conversation.requestStatus === RequestStatus.DECLINED &&
        String(conversation.requestRecipientId) === dto.recipientId
      ) {
        throw new ForbiddenException(
          'Your previous message request was declined by this user.',
        );
      }

      // If already pending
      if (
        conversation.requestStatus === RequestStatus.PENDING &&
        String(conversation.requestRecipientId) === dto.recipientId
      ) {
        throw new BadRequestException(
          'You already have a pending message request with this user.',
        );
      }
    } else {
      // Anti-spam safeguard: limit total pending requests initiated by a user
      if (isMessageRequest) {
        const pendingCount = await this.conversationModel.countDocuments({
          createdBy: callerObjId,
          requestStatus: RequestStatus.PENDING,
        });
        if (pendingCount >= 25) {
          throw new ForbiddenException(
            'You have reached the maximum number of pending message requests. Please wait for recipients to accept.',
          );
        }
      }

      // Create new conversation document
      conversation = await this.conversationModel.create({
        type: ConversationType.DIRECT,
        createdBy: callerObjId,
        participants: [callerObjId, recipientObjId],
        members: [
          {
            userId: callerObjId,
            role: 'ADMIN',
            joinedAt: new Date(),
            lastReadAt: new Date(),
            isArchived: false,
            isDeletedFor: false,
          },
          {
            userId: recipientObjId,
            role: 'MEMBER',
            joinedAt: new Date(),
            lastReadAt: new Date(0), // unread initially
            isArchived: false,
            isDeletedFor: false,
          },
        ],
        requestStatus: isMessageRequest
          ? RequestStatus.PENDING
          : RequestStatus.NONE,
        requestRecipientId: isMessageRequest ? recipientObjId : null,
        lastMessageAt: new Date(),
      });
    }

    // 6. If no message provided, this is a "find-or-create" navigation flow
    //    Return the conversation shell without creating a message.
    if (!dto.message?.trim()) {
      return {
        conversation,
        message: null,
        isMessageRequest,
      };
    }

    // 7. Create initial message
    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: callerObjId,
      body: dto.message.trim(),
      attachments: dto.attachments || [],
      status: MessageStatus.SENT,
    });

    // 8. Update conversation's lastMessage
    conversation.lastMessage = {
      messageId: message._id as Types.ObjectId,
      senderId: callerObjId,
      body: dto.message.trim(),
      createdAt: new Date(),
      status: MessageStatus.SENT,
    };
    conversation.lastMessageAt = new Date();
    // Un-delete/un-archive for both members upon new interaction
    conversation.members.forEach((m) => {
      m.isDeletedFor = false;
      if (m.userId.equals(callerObjId)) {
        m.lastReadAt = new Date();
      }
    });
    await conversation.save();

    // 9. Real-time WebSocket emission
    this.messagesGateway.notifyNewMessage(
      String(conversation._id),
      message,
      [callerId, dto.recipientId],
    );

    // 10. Send Notification to recipient
    if (this.notificationsService) {
      try {
        const notifType = isMessageRequest ? 'MESSAGE_REQUEST' : 'MESSAGE';
        const senderName = callerUser?.name || 'A user';
        await this.notificationsService.createNotification({
          recipientId: dto.recipientId,
          actorId: callerId,
          type: notifType,
          category: 'network',
          priority: isMessageRequest ? 'IMPORTANT' : 'NORMAL',
          title: isMessageRequest
            ? `New message request from ${senderName}`
            : `New message from ${senderName}`,
          message: dto.message.slice(0, 120),
          targetUrl: `/messages?c=${conversation._id}`,
          actionUrl: `/messages?c=${conversation._id}`,
          metadata: {
            conversationId: String(conversation._id),
            senderId: callerId,
          },
        });
      } catch {
        // Notification failure should never roll back messaging
      }
    }

    return {
      conversation,
      message,
      isMessageRequest,
    };
  }

  /**
   * Create a group conversation
   */
  async createGroupConversation(
    creatorId: string,
    dto: CreateGroupConversationDto,
  ) {
    const creatorObjId = this.toObjectId(creatorId);

    // Deduplicate and filter participant IDs
    const uniqueIds = Array.from(
      new Set(dto.participantIds.filter((id) => id && id !== creatorId)),
    );

    if (uniqueIds.length < 1) {
      throw new BadRequestException(
        'A group conversation must have at least one other participant.',
      );
    }

    // Check block list for all participants
    for (const pid of uniqueIds) {
      const isBlocked = await this.moderationService.hasBlockRelationship(
        creatorId,
        pid,
      );
      if (isBlocked) {
        throw new ForbiddenException(
          `Cannot add user ${pid} due to safety or block restrictions.`,
        );
      }
    }

    const participantObjIds = uniqueIds.map((id) => this.toObjectId(id));
    const allParticipants = [creatorObjId, ...participantObjIds];

    const members = [
      {
        userId: creatorObjId,
        role: 'ADMIN',
        joinedAt: new Date(),
        lastReadAt: new Date(),
        isArchived: false,
        isDeletedFor: false,
      },
      ...participantObjIds.map((uid) => ({
        userId: uid,
        role: 'MEMBER',
        joinedAt: new Date(),
        lastReadAt: new Date(0),
        isArchived: false,
        isDeletedFor: false,
      })),
    ];

    const conversation = await this.conversationModel.create({
      type: ConversationType.GROUP,
      name: dto.name.trim(),
      avatar: dto.avatar || '',
      createdBy: creatorObjId,
      participants: allParticipants,
      members,
      requestStatus: RequestStatus.NONE,
      lastMessageAt: new Date(),
    });

    let message: any = null;
    if (dto.initialMessage?.trim()) {
      message = await this.messageModel.create({
        conversationId: conversation._id,
        senderId: creatorObjId,
        body: dto.initialMessage.trim(),
        status: MessageStatus.SENT,
      });

      conversation.lastMessage = {
        messageId: message._id as Types.ObjectId,
        senderId: creatorObjId,
        body: dto.initialMessage.trim(),
        createdAt: new Date(),
        status: MessageStatus.SENT,
      };
      await conversation.save();
    }

    // Notify all participants
    this.messagesGateway.notifyConversationUpdated(
      allParticipants.map(String),
      conversation,
    );

    return { conversation, message };
  }

  /**
   * Get list of conversations for current user
   */
  async getConversations(userId: string, query: QueryConversationsDto) {
    const userObjId = this.toObjectId(userId);
    const tab = query.tab || 'chats';
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const baseFilter: any = {
      'members.userId': userObjId,
      'members.isDeletedFor': { $ne: true },
    };

    if (tab === 'requests') {
      baseFilter.requestStatus = RequestStatus.PENDING;
      baseFilter.requestRecipientId = userObjId;
    } else if (tab === 'archived') {
      baseFilter.members = {
        $elemMatch: { userId: userObjId, isArchived: true },
      };
    } else {
      // Default: 'chats' (accepted or direct, not archived)
      baseFilter.requestStatus = {
        $in: [RequestStatus.NONE, RequestStatus.ACCEPTED],
      };
      baseFilter.members = {
        $elemMatch: { userId: userObjId, isArchived: { $ne: true } },
      };
    }

    const [total, rawConversations] = await Promise.all([
      this.conversationModel.countDocuments(baseFilter),
      this.conversationModel
        .find(baseFilter)
        .populate('participants', 'name username avatar primaryRole headline primaryDiscipline privacySettings account_Status')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Enrich with unread counts and online presence
    const conversations = await Promise.all(
      rawConversations.map(async (conv: any) => {
        const myMember = conv.members.find(
          (m: any) => String(m.userId) === userId,
        );
        const lastReadAt = myMember?.lastReadAt || new Date(0);

        // Count messages created after caller's lastReadAt
        const unreadCount = await this.messageModel.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userObjId },
          createdAt: { $gt: lastReadAt },
          deletedFor: { $ne: userObjId },
        });

        // Find partner info for direct chat
        let partner: any = null;
        let isPartnerOnline = false;
        if (conv.type === ConversationType.DIRECT) {
          partner = conv.participants.find((p: any) => String(p._id) !== userId);
          if (partner) {
            // Respect partner's online presence privacy setting
            const presenceAllowed = partner.privacySettings?.onlinePresence !== false;
            isPartnerOnline = presenceAllowed
              ? this.messagesGateway.isUserOnline(String(partner._id))
              : false;
          }
        }

        return {
          id: String(conv._id),
          _id: conv._id,
          type: conv.type,
          name: conv.name || partner?.name || 'Direct Message',
          avatar: conv.avatar || partner?.avatar || '',
          partner,
          isPartnerOnline,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          requestStatus: conv.requestStatus,
          isRequestRecipient:
            String(conv.requestRecipientId) === userId,
          unreadCount,
          isMuted: Boolean(
            myMember?.mutedUntil && new Date(myMember.mutedUntil) > new Date(),
          ),
          isArchived: Boolean(myMember?.isArchived),
          createdAt: conv.createdAt,
        };
      }),
    );

    return {
      conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    };
  }

  /**
   * Get unread badges count for notifications & navigation
   */
  async getUnreadCounts(userId: string) {
    const userObjId = this.toObjectId(userId);

    // 1. Pending message requests count
    const unreadRequests = await this.conversationModel.countDocuments({
      requestStatus: RequestStatus.PENDING,
      requestRecipientId: userObjId,
      'members.isDeletedFor': { $ne: true },
    });

    // 2. Unread messages across active chats
    const activeConversations = await this.conversationModel
      .find({
        'members.userId': userObjId,
        'members.isDeletedFor': { $ne: true },
        requestStatus: { $in: [RequestStatus.NONE, RequestStatus.ACCEPTED] },
      })
      .select('members')
      .lean();

    let unreadMessages = 0;
    for (const conv of activeConversations) {
      const myMember = conv.members.find(
        (m: any) => String(m.userId) === userId,
      );
      if (myMember) {
        const count = await this.messageModel.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userObjId },
          createdAt: { $gt: myMember.lastReadAt || new Date(0) },
          deletedFor: { $ne: userObjId },
        });
        unreadMessages += count;
      }
    }

    return {
      unreadMessages,
      unreadRequests,
      total: unreadMessages + unreadRequests,
    };
  }

  /**
   * Get single conversation details
   */
  async getConversationById(userId: string, conversationId: string) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel
      .findById(convObjId)
      .populate('participants', 'name username avatar primaryRole headline primaryDiscipline privacySettings')
      .populate('createdBy', 'name username avatar')
      .lean();

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isMember = conversation.participants.some(
      (p: any) => String(p._id) === userId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        'You are not authorized to view this conversation.',
      );
    }

    const myMember = conversation.members.find(
      (m: any) => String(m.userId) === userId,
    );

    let partner: any = null;
    let isPartnerOnline = false;
    if (conversation.type === ConversationType.DIRECT) {
      partner = conversation.participants.find(
        (p: any) => String(p._id) !== userId,
      );
      if (partner) {
        const presenceAllowed = partner.privacySettings?.onlinePresence !== false;
        isPartnerOnline = presenceAllowed
          ? this.messagesGateway.isUserOnline(String(partner._id))
          : false;
      }
    }

    return {
      ...conversation,
      id: String(conversation._id),
      partner,
      isPartnerOnline,
      myMember,
      isMuted: Boolean(
        myMember?.mutedUntil && new Date(myMember.mutedUntil) > new Date(),
      ),
      isArchived: Boolean(myMember?.isArchived),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MESSAGES MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get messages inside a conversation with cursor pagination
   */
  async getMessages(
    userId: string,
    conversationId: string,
    query: QueryMessagesDto,
  ) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId).lean();
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isMember = conversation.participants.some((p) => p.equals(userObjId));
    if (!isMember) {
      throw new ForbiddenException(
        'You are not authorized to view messages in this conversation.',
      );
    }

    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const filter: any = {
      conversationId: convObjId,
      deletedFor: { $ne: userObjId },
    };

    if (query.before) {
      if (Types.ObjectId.isValid(query.before)) {
        const beforeMsg = await this.messageModel.findById(query.before).lean();
        if (beforeMsg) {
          filter.createdAt = { $lt: beforeMsg.createdAt };
        }
      } else {
        const beforeDate = new Date(query.before);
        if (!isNaN(beforeDate.getTime())) {
          filter.createdAt = { $lt: beforeDate };
        }
      }
    }

    if (query.q && query.q.trim()) {
      filter.body = new RegExp(query.q.trim(), 'i');
    }

    // Fetch messages sorted newest-to-oldest, then reverse for chat display
    const rawMessages = await this.messageModel
      .find(filter)
      .populate('senderId', 'name username avatar primaryRole')
      .populate('reactions.userId', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rawMessages.length > limit;
    const messages = hasMore ? rawMessages.slice(0, limit) : rawMessages;
    messages.reverse(); // chronological order

    const nextCursor =
      hasMore && messages.length > 0 ? String(messages[0]._id) : null;

    return {
      messages: messages.map((m: any) => ({
        ...m,
        id: String(m._id),
        isOwn: String(m.senderId?._id || m.senderId) === userId,
        body: m.isDeleted ? 'This message was deleted' : m.body,
      })),
      hasMore,
      nextCursor,
    };
  }

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isMember = conversation.participants.some((p) => p.equals(userObjId));
    if (!isMember) {
      throw new ForbiddenException(
        'You are not authorized to post in this conversation.',
      );
    }

    // If this is a pending message request, only recipient can accept/reply
    if (conversation.requestStatus === RequestStatus.PENDING) {
      const isRecipient = conversation.requestRecipientId?.equals(userObjId);
      if (!isRecipient) {
        throw new ForbiddenException(
          'Cannot send additional messages while request is pending recipient approval.',
        );
      }
      // If recipient replies, automatically accept request!
      conversation.requestStatus = RequestStatus.ACCEPTED;
    } else if (conversation.requestStatus === RequestStatus.DECLINED) {
      throw new ForbiddenException('Cannot send messages to a declined conversation.');
    }

    // Safety & block verification for all participants
    for (const p of conversation.participants) {
      if (!p.equals(userObjId)) {
        const isBlocked = await this.moderationService.hasBlockRelationship(
          userId,
          String(p),
        );
        if (isBlocked) {
          throw new ForbiddenException(
            'Cannot deliver message due to safety/blocking restrictions.',
          );
        }
      }
    }

    // Resolve replyTo metadata if present
    let replyToObj: any = null;
    if (dto.replyToId && Types.ObjectId.isValid(dto.replyToId)) {
      const replyMsg = await this.messageModel
        .findById(dto.replyToId)
        .populate('senderId', 'name')
        .lean();
      if (replyMsg && String(replyMsg.conversationId) === conversationId) {
        replyToObj = {
          messageId: replyMsg._id,
          senderId: (replyMsg.senderId as any)?._id || replyMsg.senderId,
          senderName: (replyMsg.senderId as any)?.name || 'User',
          bodySnippet: replyMsg.body ? replyMsg.body.slice(0, 80) : '',
        };
      }
    }

    const message = await this.messageModel.create({
      conversationId: convObjId,
      senderId: userObjId,
      body: dto.body.trim(),
      attachments: dto.attachments || [],
      replyTo: replyToObj,
      status: MessageStatus.SENT,
    });

    // Update conversation metadata
    conversation.lastMessage = {
      messageId: message._id as Types.ObjectId,
      senderId: userObjId,
      body: dto.body.trim(),
      createdAt: new Date(),
      status: MessageStatus.SENT,
    };
    conversation.lastMessageAt = new Date();

    // Reset deleted/archived states and update caller lastReadAt
    conversation.members.forEach((m) => {
      m.isDeletedFor = false;
      if (m.userId.equals(userObjId)) {
        m.lastReadAt = new Date();
      }
    });

    await conversation.save();

    // Populate sender info for frontend rendering
    const populated = await this.messageModel
      .findById(message._id)
      .populate('senderId', 'name username avatar primaryRole')
      .lean();

    // Real-time broadcast
    this.messagesGateway.notifyNewMessage(
      conversationId,
      populated,
      conversation.participants.map(String),
    );

    // Notify other unmuted participants
    if (this.notificationsService) {
      const senderUser = await this.userModel.findById(userObjId).lean();
      for (const m of conversation.members) {
        if (!m.userId.equals(userObjId)) {
          const isMuted = m.mutedUntil && new Date(m.mutedUntil) > new Date();
          if (!isMuted) {
            try {
              await this.notificationsService.createNotification({
                recipientId: String(m.userId),
                actorId: userId,
                type: 'MESSAGE',
                category: 'network',
                title: senderUser?.name || 'New message',
                message: dto.body.slice(0, 100),
                targetUrl: `/messages?c=${conversationId}`,
                actionUrl: `/messages?c=${conversationId}`,
                metadata: { conversationId, messageId: String(message._id) },
              });
            } catch {
              // Notification errors should not block message delivery
            }
          }
        }
      }
    }

    return populated;
  }

  /**
   * Mark conversation read for caller
   */
  async markConversationRead(userId: string, conversationId: string) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const member = conversation.members.find((m) => m.userId.equals(userObjId));
    if (!member) {
      throw new ForbiddenException('Not a member of this conversation.');
    }

    const now = new Date();
    member.lastReadAt = now;
    await conversation.save();

    // Update readBy receipts on messages where caller is not sender
    await this.messageModel.updateMany(
      {
        conversationId: convObjId,
        senderId: { $ne: userObjId },
        'readBy.userId': { $ne: userObjId },
      },
      {
        $push: { readBy: { userId: userObjId, readAt: now } },
        $set: { status: MessageStatus.READ },
      },
    );

    this.messagesGateway.notifyReadReceipt(conversationId, userId, now);

    return { success: true, lastReadAt: now };
  }

  /**
   * Accept a message request
   */
  async acceptMessageRequest(userId: string, conversationId: string) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (
      !conversation.requestRecipientId?.equals(userObjId) ||
      conversation.requestStatus !== RequestStatus.PENDING
    ) {
      throw new ForbiddenException('No pending request for this user to accept.');
    }

    conversation.requestStatus = RequestStatus.ACCEPTED;
    await conversation.save();

    // Notify participants via WebSocket
    this.messagesGateway.notifyConversationUpdated(
      conversation.participants.map(String),
      conversation,
    );

    // Notify requester
    if (this.notificationsService) {
      try {
        const accepter = await this.userModel.findById(userObjId).lean();
        await this.notificationsService.createNotification({
          recipientId: String(conversation.createdBy),
          actorId: userId,
          type: 'MESSAGE_REQUEST_ACCEPTED',
          category: 'network',
          title: 'Message Request Accepted',
          message: `${accepter?.name || 'User'} accepted your message request.`,
          targetUrl: `/messages?c=${conversationId}`,
          actionUrl: `/messages?c=${conversationId}`,
          metadata: { conversationId },
        });
      } catch {
        // Safe fail
      }
    }

    return { success: true, conversation };
  }

  /**
   * Decline a message request
   */
  async declineMessageRequest(userId: string, conversationId: string) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (
      !conversation.requestRecipientId?.equals(userObjId) ||
      conversation.requestStatus !== RequestStatus.PENDING
    ) {
      throw new ForbiddenException('No pending request for this user to decline.');
    }

    conversation.requestStatus = RequestStatus.DECLINED;
    // Archive or hide for recipient
    const member = conversation.members.find((m) => m.userId.equals(userObjId));
    if (member) member.isArchived = true;

    await conversation.save();

    this.messagesGateway.notifyConversationUpdated(
      [userId, String(conversation.createdBy)],
      conversation,
    );

    return { success: true, message: 'Message request declined.' };
  }

  /**
   * Edit own recent message (within 15 minutes)
   */
  async editMessage(userId: string, messageId: string, dto: EditMessageDto) {
    const msgObjId = this.toObjectId(messageId);
    const userObjId = this.toObjectId(userId);

    const message = await this.messageModel.findById(msgObjId);
    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (!message.senderId.equals(userObjId)) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message.');
    }

    // 15-minute edit window
    const fifteenMinutes = 15 * 60 * 1000;
    const isWithinWindow =
      Date.now() - new Date(message.createdAt).getTime() <= fifteenMinutes;

    if (!isWithinWindow) {
      throw new BadRequestException(
        'Messages can only be edited within 15 minutes of sending.',
      );
    }

    message.body = dto.body.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Update lastMessage on conversation if it was the last message
    await this.conversationModel.updateOne(
      { _id: message.conversationId, 'lastMessage.messageId': message._id },
      { $set: { 'lastMessage.body': dto.body.trim() } },
    );

    const populated = await this.messageModel
      .findById(message._id)
      .populate('senderId', 'name username avatar primaryRole')
      .lean();

    this.messagesGateway.notifyMessageUpdated(
      String(message.conversationId),
      populated,
    );

    return populated;
  }

  /**
   * Delete message: for me or for everyone
   */
  async deleteMessage(
    userId: string,
    messageId: string,
    mode: 'me' | 'everyone' = 'me',
  ) {
    const msgObjId = this.toObjectId(messageId);
    const userObjId = this.toObjectId(userId);

    const message = await this.messageModel.findById(msgObjId);
    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    const conversation = await this.conversationModel.findById(
      message.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isMember = conversation.participants.some((p) => p.equals(userObjId));
    if (!isMember) {
      throw new ForbiddenException('Not a member of this conversation.');
    }

    if (mode === 'everyone') {
      const isSender = message.senderId.equals(userObjId);
      const member = conversation.members.find((m) => m.userId.equals(userObjId));
      const isAdmin = member?.role === 'ADMIN';

      if (!isSender && !isAdmin) {
        throw new ForbiddenException(
          'Only the message sender or group admin can delete for everyone.',
        );
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.body = 'This message was deleted';
      message.attachments = [];
      await message.save();

      // Update last message if applicable
      await this.conversationModel.updateOne(
        { _id: message.conversationId, 'lastMessage.messageId': message._id },
        { $set: { 'lastMessage.body': 'This message was deleted' } },
      );

      this.messagesGateway.notifyMessageDeleted(
        String(message.conversationId),
        messageId,
        true,
      );

      return { success: true, message: 'Message deleted for everyone.' };
    } else {
      // Delete for me
      if (!message.deletedFor.some((uid) => uid.equals(userObjId))) {
        message.deletedFor.push(userObjId);
        await message.save();
      }

      this.messagesGateway.notifyMessageDeleted(
        String(message.conversationId),
        messageId,
        false,
      );

      return { success: true, message: 'Message deleted for you.' };
    }
  }

  /**
   * Toggle emoji reaction on message
   */
  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const msgObjId = this.toObjectId(messageId);
    const userObjId = this.toObjectId(userId);

    const message = await this.messageModel.findById(msgObjId);
    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    const conversation = await this.conversationModel.findById(
      message.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const isMember = conversation.participants.some((p) => p.equals(userObjId));
    if (!isMember) {
      throw new ForbiddenException('Not a member of this conversation.');
    }

    const existingIdx = message.reactions.findIndex(
      (r) => r.userId.equals(userObjId) && r.emoji === emoji,
    );

    if (existingIdx > -1) {
      // Remove reaction
      message.reactions.splice(existingIdx, 1);
    } else {
      // If user reacted with a different emoji, replace it or add new
      const otherIdx = message.reactions.findIndex((r) =>
        r.userId.equals(userObjId),
      );
      if (otherIdx > -1) {
        message.reactions.splice(otherIdx, 1);
      }
      message.reactions.push({
        userId: userObjId,
        emoji,
        reactedAt: new Date(),
      });
    }

    await message.save();

    const populated = await this.messageModel
      .findById(message._id)
      .populate('reactions.userId', 'name username')
      .lean();

    this.messagesGateway.notifyReaction(
      String(message.conversationId),
      messageId,
      populated?.reactions || [],
    );

    return { success: true, reactions: populated?.reactions || [] };
  }

  /**
   * Mute / Unmute conversation
   */
  async muteConversation(
    userId: string,
    conversationId: string,
    dto: MuteConversationDto,
  ) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const member = conversation.members.find((m) => m.userId.equals(userObjId));
    if (!member) {
      throw new ForbiddenException('Not a member of this conversation.');
    }

    member.mutedUntil = dto.muted
      ? dto.until
        ? new Date(dto.until)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // far future for indefinite
      : null;

    await conversation.save();

    return {
      success: true,
      isMuted: dto.muted,
      mutedUntil: member.mutedUntil,
    };
  }

  /**
   * Archive / Unarchive conversation
   */
  async archiveConversation(
    userId: string,
    conversationId: string,
    dto: ArchiveConversationDto,
  ) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const member = conversation.members.find((m) => m.userId.equals(userObjId));
    if (!member) {
      throw new ForbiddenException('Not a member of this conversation.');
    }

    member.isArchived = dto.archived;
    await conversation.save();

    return { success: true, isArchived: dto.archived };
  }

  /**
   * Report conversation to moderation
   */
  async reportConversation(
    userId: string,
    conversationId: string,
    dto: ReportConversationDto,
  ) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const report = await this.moderationService.createReport(userId, {
      targetType: ReportTargetType.CONVERSATION,
      targetId: conversationId,
      reason: dto.reason,
      details: dto.details,
    });

    return { success: true, reportId: report._id };
  }

  /**
   * Report specific message to moderation
   */
  async reportMessage(
    userId: string,
    messageId: string,
    dto: ReportConversationDto,
  ) {
    const msgObjId = this.toObjectId(messageId);

    const message = await this.messageModel.findById(msgObjId);
    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    const report = await this.moderationService.createReport(userId, {
      targetType: ReportTargetType.MESSAGE,
      targetId: messageId,
      reason: dto.reason,
      details: dto.details,
    });

    return { success: true, reportId: report._id };
  }

  /**
   * Leave a group conversation
   */
  async leaveGroup(userId: string, conversationId: string) {
    const convObjId = this.toObjectId(conversationId);
    const userObjId = this.toObjectId(userId);

    const conversation = await this.conversationModel.findById(convObjId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Cannot leave a direct conversation.');
    }

    conversation.participants = conversation.participants.filter(
      (p) => !p.equals(userObjId),
    );
    conversation.members = conversation.members.filter(
      (m) => !m.userId.equals(userObjId),
    );

    await conversation.save();

    this.messagesGateway.notifyConversationUpdated(
      conversation.participants.map(String),
      conversation,
    );

    return { success: true, message: 'You have left the group.' };
  }
}
