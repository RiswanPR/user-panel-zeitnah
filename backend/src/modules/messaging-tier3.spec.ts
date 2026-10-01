import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MessagingService } from './messaging/messaging.service';
import { ModerationService } from './moderation/moderation.service';
import { NotificationsService } from './notifications/notifications.service';
import { MessagesGateway } from './messaging/messages.gateway';
import {
  Conversation,
  ConversationType,
  RequestStatus,
} from './messaging/schemas/conversation.schema';
import { Message, MessageStatus } from './messaging/schemas/message.schema';
import { SavedMessage } from './messaging/schemas/saved-message.schema';
import { User } from './auth/schemas/user.schema';
import { NetworkConnection } from './network/schemas/connection.schema';

const makeQuery = (val: any) => {
  const p: any = Promise.resolve(val);
  const chain: any = {
    populate: jest.fn().mockImplementation(() => chain),
    sort: jest.fn().mockImplementation(() => chain),
    skip: jest.fn().mockImplementation(() => chain),
    limit: jest.fn().mockImplementation(() => chain),
    select: jest.fn().mockImplementation(() => chain),
    lean: jest.fn().mockResolvedValue(val),
    exec: jest.fn().mockResolvedValue(val),
  };
  p.populate = jest.fn().mockReturnValue(chain);
  p.sort = jest.fn().mockReturnValue(chain);
  p.skip = jest.fn().mockReturnValue(chain);
  p.limit = jest.fn().mockReturnValue(chain);
  p.select = jest.fn().mockReturnValue(chain);
  p.lean = jest.fn().mockResolvedValue(val);
  p.exec = jest.fn().mockResolvedValue(val);
  return p;
};

describe('Messaging Tier 3 — Collaboration, Mentions, Threads, Forwarding & Group Management QA Suite', () => {
  let messagingService: MessagingService;
  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockUserModel: any;
  let mockModerationService: any;
  let mockNotificationsService: any;
  let mockMessagesGateway: any;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const userCId = new Types.ObjectId().toString();
  const strangerId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockConversationModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockMessageModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          save: jest.fn().mockResolvedValue(true),
          ...dto,
        }),
      ),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      distinct: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockUserModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
    };

    mockModerationService = {
      hasBlockRelationship: jest.fn().mockResolvedValue(false),
    };

    mockNotificationsService = {
      createNotification: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    mockMessagesGateway = {
      notifyNewMessage: jest.fn(),
      notifyMessageUpdated: jest.fn(),
      notifyMessageDeleted: jest.fn(),
      notifyReadReceipt: jest.fn(),
      notifyReaction: jest.fn(),
      notifyConversationUpdated: jest.fn(),
      notifyThreadReply: jest.fn(),
      isUserOnline: jest.fn().mockReturnValue(false),
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(NetworkConnection.name),
          useValue: { find: jest.fn().mockImplementation(() => makeQuery([])) },
        },
        {
          provide: getModelToken(SavedMessage.name),
          useValue: { find: jest.fn().mockImplementation(() => makeQuery([])) },
        },
        {
          provide: ModerationService,
          useValue: mockModerationService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: MessagesGateway,
          useValue: mockMessagesGateway,
        },
      ],
    }).compile();

    messagingService = module.get<MessagingService>(MessagingService);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE A: MENTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Phase A — Mentions', () => {
    it('should return mention suggestions scoped strictly to conversation participants', async () => {
      const convId = new Types.ObjectId().toString();
      const convDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
          new Types.ObjectId(userCId),
        ],
      };
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery(convDoc),
      );

      mockUserModel.find.mockImplementation(() =>
        makeQuery([
          {
            _id: new Types.ObjectId(userBId),
            name: 'Sarah Connor',
            username: 'sarahc',
            avatar: 'avatarB.jpg',
            primaryRole: 'ENGINEER',
          },
        ]),
      );

      const suggestions = await messagingService.getMentionSuggestions(
        userAId,
        convId,
        { q: 'sarah' },
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].username).toBe('sarahc');
      expect(suggestions[0].name).toBe('Sarah Connor');
    });

    it('should reject mention suggestions for non-participant callers', async () => {
      const convId = new Types.ObjectId().toString();
      const convDoc = {
        _id: new Types.ObjectId(convId),
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
      };
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery(convDoc),
      );

      await expect(
        messagingService.getMentionSuggestions(strangerId, convId, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify mentions when sending message and dispatch MESSAGE_MENTION notification with deep link', async () => {
      const convId = new Types.ObjectId().toString();
      const convDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        requestStatus: RequestStatus.ACCEPTED,
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
        members: [
          { userId: new Types.ObjectId(userAId), isDeletedFor: false },
          { userId: new Types.ObjectId(userBId), isDeletedFor: false },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(convDoc);

      mockUserModel.find.mockImplementation(() =>
        makeQuery([
          {
            _id: new Types.ObjectId(userBId),
            name: 'Bob Miller',
            username: 'bobm',
          },
        ]),
      );

      mockUserModel.findById.mockImplementation(() =>
        makeQuery({ _id: new Types.ObjectId(userAId), name: 'Alice Smith' }),
      );

      await messagingService.sendMessage(userAId, convId, {
        body: 'Hello @bobm can you review this?',
        mentions: ['bobm'],
      });

      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mentions: [
            expect.objectContaining({
              userId: new Types.ObjectId(userBId),
              username: 'bobm',
            }),
          ],
        }),
      );

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: userBId,
          type: 'MESSAGE_MENTION',
          targetUrl: expect.stringContaining(`/messages?c=${convId}&m=`),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE B: THREADS / DISCUSSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Phase B — Threads / Discussions', () => {
    it('should create a thread reply and increment root reply count and update participants', async () => {
      const convId = new Types.ObjectId().toString();
      const rootMsgId = new Types.ObjectId().toString();

      const convDoc = {
        _id: new Types.ObjectId(convId),
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
        lastMessageAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(convDoc);

      const rootDoc = {
        _id: new Types.ObjectId(rootMsgId),
        conversationId: new Types.ObjectId(convId),
        senderId: new Types.ObjectId(userBId),
        threadReplyCount: 0,
        threadParticipants: [],
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockMessageModel.findOne.mockResolvedValue(rootDoc);

      const reply = await messagingService.createThreadReply(
        userAId,
        convId,
        rootMsgId,
        {
          body: 'Here is my thoughtful follow-up on your design proposal.',
        },
      );

      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadRootId: new Types.ObjectId(rootMsgId),
          body: 'Here is my thoughtful follow-up on your design proposal.',
        }),
      );

      expect(rootDoc.threadReplyCount).toBe(1);
      expect(rootDoc.threadParticipants).toContainEqual(
        new Types.ObjectId(userAId),
      );
      expect(mockMessagesGateway.notifyThreadReply).toHaveBeenCalled();
    });

    it('should reject thread reply if root message is deleted', async () => {
      const convId = new Types.ObjectId().toString();
      const rootMsgId = new Types.ObjectId().toString();

      mockConversationModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(convId),
        participants: [new Types.ObjectId(userAId)],
      });

      mockMessageModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(rootMsgId),
        isDeleted: true,
      });

      await expect(
        messagingService.createThreadReply(userAId, convId, rootMsgId, {
          body: 'Attempt to reply',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should get thread replies and return rootMessage with chronological replies', async () => {
      const convId = new Types.ObjectId().toString();
      const rootMsgId = new Types.ObjectId().toString();

      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(convId),
          participants: [
            new Types.ObjectId(userAId),
            new Types.ObjectId(userBId),
          ],
        }),
      );

      mockMessageModel.findOne.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(rootMsgId),
          body: 'Root discussion point',
          senderId: { _id: userAId, name: 'Alice' },
          threadReplyCount: 1,
        }),
      );

      mockMessageModel.find.mockImplementation(() =>
        makeQuery([
          {
            _id: new Types.ObjectId(),
            body: 'First reply',
            senderId: { _id: userBId, name: 'Bob' },
            createdAt: new Date(),
          },
        ]),
      );

      const threadData = await messagingService.getThreadReplies(
        userAId,
        convId,
        rootMsgId,
        {},
      );

      expect(threadData.rootMessage).toBeDefined();
      expect(threadData.rootMessage.body).toBe('Root discussion point');
      expect(threadData.replies).toHaveLength(1);
      expect(threadData.replies[0].body).toBe('First reply');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE C: MESSAGE FORWARDING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Phase C — Message Forwarding', () => {
    it('should forward a message to target conversations safely preserving sender attribution without leaking source conversation id', async () => {
      const sourceConvId = new Types.ObjectId().toString();
      const targetConvId = new Types.ObjectId().toString();
      const sourceMsgId = new Types.ObjectId().toString();

      mockMessageModel.findById.mockImplementation((id: any) => {
        if (String(id) === sourceMsgId) {
          return makeQuery({
            _id: new Types.ObjectId(sourceMsgId),
            conversationId: new Types.ObjectId(sourceConvId),
            body: 'Key strategic update for team review',
            senderId: { _id: userBId, name: 'Bob Miller', username: 'bobm' },
            attachments: [],
            isDeleted: false,
          });
        }
        return makeQuery({
          _id: new Types.ObjectId(),
          senderId: { _id: userAId, name: 'Alice Smith' },
        });
      });

      mockConversationModel.findById.mockImplementation((id: any) => {
        if (String(id) === sourceConvId) {
          return makeQuery({
            _id: new Types.ObjectId(sourceConvId),
            participants: [
              new Types.ObjectId(userAId),
              new Types.ObjectId(userBId),
            ],
          });
        }
        return makeQuery(null);
      });

      mockConversationModel.find.mockImplementation(() =>
        makeQuery([
          {
            _id: new Types.ObjectId(targetConvId),
            participants: [
              new Types.ObjectId(userAId),
              new Types.ObjectId(userCId),
            ],
          },
        ]),
      );

      const result = await messagingService.forwardMessage(userAId, {
        sourceMessageId: sourceMsgId,
        targetConversationIds: [targetConvId],
      });

      expect(result.success).toBe(true);
      expect(result.forwardedCount).toBe(1);
      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: new Types.ObjectId(targetConvId),
          body: 'Key strategic update for team review',
          isForwarded: true,
          forwardedFrom: {
            originalSenderName: 'Bob Miller',
          },
        }),
      );
    });

    it('should reject forwarding if user is not a participant in the source conversation', async () => {
      const sourceConvId = new Types.ObjectId().toString();
      const targetConvId = new Types.ObjectId().toString();
      const sourceMsgId = new Types.ObjectId().toString();

      mockMessageModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(sourceMsgId),
          conversationId: new Types.ObjectId(sourceConvId),
          body: 'Private confidential note',
          senderId: { _id: userBId },
          isDeleted: false,
        }),
      );

      // Caller is strangerId, not in participants
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(sourceConvId),
          participants: [
            new Types.ObjectId(userAId),
            new Types.ObjectId(userBId),
          ],
        }),
      );

      await expect(
        messagingService.forwardMessage(strangerId, {
          sourceMessageId: sourceMsgId,
          targetConversationIds: [targetConvId],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE D: ADVANCED GROUP COLLABORATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Phase D — Advanced Group Collaboration', () => {
    it('should allow group admin to add new members to group', async () => {
      const convId = new Types.ObjectId().toString();
      const groupDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        createdBy: new Types.ObjectId(userAId),
        participants: [new Types.ObjectId(userAId)],
        members: [{ userId: new Types.ObjectId(userAId), role: 'ADMIN' }],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(groupDoc);

      mockUserModel.find.mockImplementation(() =>
        makeQuery([
          { _id: new Types.ObjectId(userBId), name: 'Bob', username: 'bobm' },
        ]),
      );

      const result = await messagingService.addGroupMembers(userAId, convId, {
        userIds: [userBId],
      });

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(groupDoc.participants).toContainEqual(new Types.ObjectId(userBId));
      expect(mockMessagesGateway.notifyConversationUpdated).toHaveBeenCalled();
    });

    it('should reject non-admin from adding group members', async () => {
      const convId = new Types.ObjectId().toString();
      const groupDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        createdBy: new Types.ObjectId(userAId),
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
        members: [
          { userId: new Types.ObjectId(userAId), role: 'ADMIN' },
          { userId: new Types.ObjectId(userBId), role: 'MEMBER' },
        ],
      };
      mockConversationModel.findById.mockResolvedValue(groupDoc);

      await expect(
        messagingService.addGroupMembers(userBId, convId, {
          userIds: [userCId],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update group member role when requested by group admin', async () => {
      const convId = new Types.ObjectId().toString();
      const memberB = { userId: new Types.ObjectId(userBId), role: 'MEMBER' };
      const groupDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        createdBy: new Types.ObjectId(userAId),
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
        members: [
          { userId: new Types.ObjectId(userAId), role: 'ADMIN' },
          memberB,
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(groupDoc);

      const result = await messagingService.updateGroupMemberRole(
        userAId,
        convId,
        userBId,
        { role: 'ADMIN' },
      );

      expect(result.success).toBe(true);
      expect(memberB.role).toBe('ADMIN');
      expect(mockMessagesGateway.notifyConversationUpdated).toHaveBeenCalled();
    });

    it('should prevent demoting group creator', async () => {
      const convId = new Types.ObjectId().toString();
      const groupDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        createdBy: new Types.ObjectId(userAId),
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
        members: [
          { userId: new Types.ObjectId(userAId), role: 'ADMIN' },
          { userId: new Types.ObjectId(userBId), role: 'ADMIN' },
        ],
      };
      mockConversationModel.findById.mockResolvedValue(groupDoc);

      await expect(
        messagingService.updateGroupMemberRole(userBId, convId, userAId, {
          role: 'MEMBER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update group metadata (name, description, avatar) when requested by admin', async () => {
      const convId = new Types.ObjectId().toString();
      const groupDoc = {
        _id: new Types.ObjectId(convId),
        type: ConversationType.GROUP,
        createdBy: new Types.ObjectId(userAId),
        name: 'Old Name',
        description: 'Old Description',
        avatar: '',
        participants: [new Types.ObjectId(userAId)],
        members: [{ userId: new Types.ObjectId(userAId), role: 'ADMIN' }],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockResolvedValue(groupDoc);

      const result = await messagingService.updateGroupMetadata(
        userAId,
        convId,
        {
          name: 'New Architecture Team',
          description: 'Collaborative space for engineering discussions',
        },
      );

      expect(result.success).toBe(true);
      expect(groupDoc.name).toBe('New Architecture Team');
      expect(groupDoc.description).toBe(
        'Collaborative space for engineering discussions',
      );
      expect(mockMessagesGateway.notifyConversationUpdated).toHaveBeenCalled();
    });
  });
});
