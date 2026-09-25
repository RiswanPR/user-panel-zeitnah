import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MessagingService } from './messaging/messaging.service';
import { NetworkConnectionsService } from './network/services/network-connections.service';
import { ModerationService } from './moderation/moderation.service';
import { NotificationsService } from './notifications/notifications.service';
import { MessagesGateway } from './messaging/messages.gateway';
import { Conversation } from './messaging/schemas/conversation.schema';
import { Message } from './messaging/schemas/message.schema';
import { User } from './auth/schemas/user.schema';
import { NetworkConnection } from './network/schemas/connection.schema';
import { Notification } from './notifications/schemas/notification.schema';

const makeQuery = (val: any) => {
  const p: any = Promise.resolve(val);
  p.populate = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(val),
    exec: jest.fn().mockResolvedValue(val),
  });
  p.lean = jest.fn().mockResolvedValue(val);
  p.exec = jest.fn().mockResolvedValue(val);
  return p;
};

describe('Phase 7 — Messaging + Infrastructure People Discovery QA Suite', () => {
  let messagingService: MessagingService;
  let networkService: NetworkConnectionsService;

  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockUserModel: any;
  let mockConnectionModel: any;
  let mockNotificationModel: any;
  let mockModerationService: any;
  let mockNotificationsService: any;
  let mockMessagesGateway: any;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const userCId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockConversationModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue(true),
          participants: dto.participants || [],
          members: dto.members || [],
          ...dto,
        }),
      ),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockMessageModel = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          reactions: [],
          status: 'sent',
          createdAt: new Date(),
          save: jest.fn().mockResolvedValue(true),
          ...dto,
        }),
      ),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockUserModel = {
      findById: jest.fn().mockImplementation((id: any) =>
        makeQuery({
          _id: new Types.ObjectId(id),
          name: 'Test User',
          privacySettings: { messaging: 'ANYONE' },
        }),
      ),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockConnectionModel = {
      create: jest.fn(),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockNotificationModel = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockModerationService = {
      hasBlockRelationship: jest.fn().mockResolvedValue(false),
      getBlockedUserIds: jest.fn().mockResolvedValue([]),
      getExcludedUserIds: jest.fn().mockResolvedValue([]),
      blockUser: jest.fn().mockResolvedValue({ success: true }),
      createReport: jest.fn().mockResolvedValue({ success: true, _id: new Types.ObjectId() }),
    };

    mockNotificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockMessagesGateway = {
      notifyNewMessage: jest.fn(),
      notifyMessageUpdated: jest.fn(),
      notifyMessageDeleted: jest.fn(),
      notifyReadReceipt: jest.fn(),
      notifyReaction: jest.fn(),
      notifyConversationUpdated: jest.fn(),
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        NetworkConnectionsService,
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
          useValue: mockConnectionModel,
        },
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
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
    networkService = module.get<NetworkConnectionsService>(NetworkConnectionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. People Discovery & Infrastructure Taxonomy Filtering', () => {
    it('filters professionals by canonical discipline, sector, and experience range', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(userAId),
          primaryDiscipline: 'Civil Engineering',
          infrastructureSectors: ['Highways'],
        }),
      });

      const candidateUser = {
        _id: new Types.ObjectId(userBId),
        name: 'Rahul Kumar',
        username: 'rahulk',
        primaryRole: 'PROFESSIONAL',
        primaryDiscipline: 'Civil Engineering',
        infrastructureSectors: ['Highways'],
        structuredSkills: {
          softwareSkills: ['Primavera P6', 'AutoCAD'],
        },
        yearsOfExperience: 4,
        privacySettings: { messaging: 'ANYONE' },
      };

      mockUserModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([candidateUser]),
            }),
          }),
        }),
      });
      mockUserModel.countDocuments.mockResolvedValue(1);

      mockConnectionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await networkService.getPeople(userAId, {
        discipline: 'Civil Engineering',
        sector: 'Highways',
        software: 'Primavera P6',
        experience: '3-5',
        page: 1,
        limit: 10,
      });

      expect(result.people).toHaveLength(1);
      const person = result.people[0];
      expect(person.name).toBe('Rahul Kumar');
      expect(person.primaryDiscipline).toBe('Civil Engineering');
      expect(person.recommendationReason).toContain('Civil Engineering');
      expect(person.canMessage).toBe(true);
      expect(person.messageAction).toBe('request');
    });

    it('excludes blocked users from discovery results', async () => {
      mockModerationService.getExcludedUserIds.mockResolvedValue([userBId]);

      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(userAId) }),
      });

      mockUserModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockUserModel.countDocuments.mockResolvedValue(0);
      mockConnectionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await networkService.getPeople(userAId, {});
      expect(result.people).toHaveLength(0);
      expect(mockModerationService.getExcludedUserIds).toHaveBeenCalledWith(userAId);
    });
  });

  describe('2. Message Privacy & Safety Enforcement', () => {
    it('prohibits messaging when recipient privacy is set to NOBODY', async () => {
      mockUserModel.findById.mockImplementation((id: any) =>
        makeQuery({
          _id: new Types.ObjectId(id),
          name: 'Private User',
          privacySettings: { messaging: 'NOBODY' },
        }),
      );

      await expect(
        messagingService.startDirectConversation(userAId, {
          recipientId: userBId,
          message: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prohibits messaging non-connections when recipient privacy is CONNECTIONS_ONLY', async () => {
      mockUserModel.findById.mockImplementation((id: any) =>
        makeQuery({
          _id: new Types.ObjectId(id),
          name: 'Connected Only User',
          privacySettings: { messaging: 'CONNECTIONS_ONLY' },
        }),
      );

      // No accepted connection
      mockConnectionModel.findOne.mockResolvedValue(null);

      await expect(
        messagingService.startDirectConversation(userAId, {
          recipientId: userBId,
          message: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows messaging connections when recipient privacy is CONNECTIONS_ONLY', async () => {
      mockUserModel.findById.mockImplementation((id: any) =>
        makeQuery({
          _id: new Types.ObjectId(id),
          name: 'Connected User',
          privacySettings: { messaging: 'CONNECTIONS_ONLY' },
        }),
      );

      // Accepted connection exists
      mockConnectionModel.findOne.mockResolvedValue({ status: 'accepted' });
      mockConversationModel.findOne.mockResolvedValue(null);

      const res = await messagingService.startDirectConversation(userAId, {
        recipientId: userBId,
        message: 'Hello fellow connection',
      });

      expect(res.conversation).toBeDefined();
      expect(res.isMessageRequest).toBe(false);
    });

    it('rejects messaging if a block relationship exists in ModerationService', async () => {
      mockModerationService.hasBlockRelationship.mockResolvedValue(true);

      mockUserModel.findById.mockImplementation((id: any) =>
        makeQuery({
          _id: new Types.ObjectId(id),
          privacySettings: { messaging: 'ANYONE' },
        }),
      );

      await expect(
        messagingService.startDirectConversation(userAId, {
          recipientId: userBId,
          message: 'Unwanted message',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Conversation Access & Anti-Tampering Security', () => {
    it('fails when a non-member attempts to read a conversation', async () => {
      const convId = new Types.ObjectId().toString();
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(convId),
          participants: [new Types.ObjectId(userBId), new Types.ObjectId(userCId)],
          members: [
            { userId: new Types.ObjectId(userBId), status: 'ACTIVE' },
            { userId: new Types.ObjectId(userCId), status: 'ACTIVE' },
          ],
        }),
      );

      await expect(
        messagingService.getMessages(userAId, convId, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('fails when a non-member attempts to send a message to a conversation', async () => {
      const convId = new Types.ObjectId().toString();
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(convId),
          participants: [new Types.ObjectId(userBId), new Types.ObjectId(userCId)],
          members: [
            { userId: new Types.ObjectId(userBId), status: 'ACTIVE' },
            { userId: new Types.ObjectId(userCId), status: 'ACTIVE' },
          ],
        }),
      );

      await expect(
        messagingService.sendMessage(userAId, convId, { body: 'Unauthorized message' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('always binds message sender identity to authenticated user session', async () => {
      const convId = new Types.ObjectId().toString();
      const mockConv = {
        _id: new Types.ObjectId(convId),
        type: 'DIRECT',
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        members: [
          { userId: new Types.ObjectId(userAId), status: 'ACTIVE', lastReadAt: new Date() },
          { userId: new Types.ObjectId(userBId), status: 'ACTIVE', lastReadAt: new Date() },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockImplementation(() => makeQuery(mockConv));

      const mockPopulatedMsg = {
        _id: new Types.ObjectId(),
        conversationId: new Types.ObjectId(convId),
        senderId: { _id: new Types.ObjectId(userAId), name: 'User A' },
        body: 'Authenticated message',
        status: 'sent',
      };
      mockMessageModel.findById.mockImplementation(() => makeQuery(mockPopulatedMsg));

      await messagingService.sendMessage(userAId, convId, {
        body: 'Authenticated message',
      });

      expect(mockMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: expect.any(Types.ObjectId),
          senderId: expect.any(Types.ObjectId),
          body: 'Authenticated message',
        }),
      );
    });
  });

  describe('4. Message Request Lifecycle', () => {
    it('creates a PENDING message request when contacting non-connected user with ANYONE privacy', async () => {
      mockUserModel.findById.mockImplementation((id: any) =>
        makeQuery({
          _id: new Types.ObjectId(id),
          name: 'New Contact',
          privacySettings: { messaging: 'ANYONE' },
        }),
      );

      mockConnectionModel.findOne.mockResolvedValue(null);
      mockConversationModel.findOne.mockResolvedValue(null);

      const res = await messagingService.startDirectConversation(userAId, {
        recipientId: userBId,
        message: 'Hi, I saw your highway project!',
      });

      expect(res.isMessageRequest).toBe(true);
      expect(mockConversationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestStatus: 'PENDING',
          requestRecipientId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('allows recipient to accept request and transitions conversation to ACCEPTED', async () => {
      const convId = new Types.ObjectId().toString();
      const mockConv = {
        _id: new Types.ObjectId(convId),
        requestStatus: 'PENDING',
        requestRecipientId: new Types.ObjectId(userBId),
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        members: [
          { userId: new Types.ObjectId(userAId), status: 'ACTIVE' },
          { userId: new Types.ObjectId(userBId), status: 'ACTIVE' },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockImplementation(() => makeQuery(mockConv));

      const res = await messagingService.acceptMessageRequest(userBId, convId);
      expect(res.success).toBe(true);
      expect(mockConv.requestStatus).toBe('ACCEPTED');
      expect(mockMessagesGateway.notifyConversationUpdated).toHaveBeenCalled();
    });

    it('prevents non-recipient from accepting message request', async () => {
      const convId = new Types.ObjectId().toString();
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(convId),
          requestStatus: 'PENDING',
          requestRecipientId: new Types.ObjectId(userBId),
          participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        }),
      );

      await expect(
        messagingService.acceptMessageRequest(userAId, convId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows recipient to decline request and marks requestStatus as DECLINED', async () => {
      const convId = new Types.ObjectId().toString();
      const mockConv = {
        _id: new Types.ObjectId(convId),
        requestStatus: 'PENDING',
        requestRecipientId: new Types.ObjectId(userBId),
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        createdBy: new Types.ObjectId(userAId),
        members: [
          { userId: new Types.ObjectId(userAId), status: 'ACTIVE' },
          { userId: new Types.ObjectId(userBId), status: 'ACTIVE' },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockImplementation(() => makeQuery(mockConv));

      const res = await messagingService.declineMessageRequest(userBId, convId);
      expect(res.success).toBe(true);
      expect(mockConv.requestStatus).toBe('DECLINED');
    });
  });

  describe('5. Message Operations: Edit, Delete, Reactions & Replies', () => {
    it('allows author to edit recent message within 15 minute window', async () => {
      const msgId = new Types.ObjectId().toString();
      const convId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(convId),
        senderId: new Types.ObjectId(userAId),
        body: 'Initial typo',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
        isEdited: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockMessageModel.findById.mockImplementation(() => makeQuery(mockMsg));

      const updated = await messagingService.editMessage(userAId, msgId, {
        body: 'Corrected text',
      });

      expect(updated.body).toBe('Corrected text');
      expect(mockMsg.isEdited).toBe(true);
      expect(mockMessagesGateway.notifyMessageUpdated).toHaveBeenCalled();
    });

    it('rejects editing a message after 15 minute edit window has expired', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        senderId: new Types.ObjectId(userAId),
        body: 'Old message',
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
      };
      mockMessageModel.findById.mockImplementation(() => makeQuery(mockMsg));

      await expect(
        messagingService.editMessage(userAId, msgId, { body: 'Too late' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects editing another users message', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        senderId: new Types.ObjectId(userBId),
        body: 'User B message',
        createdAt: new Date(),
      };
      mockMessageModel.findById.mockImplementation(() => makeQuery(mockMsg));

      await expect(
        messagingService.editMessage(userAId, msgId, { body: 'Tampering' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('toggles message reactions correctly', async () => {
      const msgId = new Types.ObjectId().toString();
      const convId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(convId),
        reactions: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockImplementation(() => makeQuery(mockMsg));

      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(convId),
          participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
          members: [{ userId: new Types.ObjectId(userAId), status: 'ACTIVE' }],
        }),
      );

      // Add reaction
      await messagingService.toggleReaction(userAId, msgId, '👍');
      expect(mockMsg.reactions).toHaveLength(1);
      expect(mockMsg.reactions[0].emoji).toBe('👍');
      expect(mockMsg.reactions[0].userId.equals(new Types.ObjectId(userAId))).toBe(true);

      // Toggle off same reaction
      await messagingService.toggleReaction(userAId, msgId, '👍');
      expect(mockMsg.reactions).toHaveLength(0);
    });

    it('allows author to delete for everyone while preventing non-authors', async () => {
      const msgId = new Types.ObjectId().toString();
      const convId = new Types.ObjectId().toString();
      const mockMsg = {
        _id: new Types.ObjectId(msgId),
        conversationId: new Types.ObjectId(convId),
        senderId: new Types.ObjectId(userAId),
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockMessageModel.findById.mockImplementation(() => makeQuery(mockMsg));

      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: new Types.ObjectId(convId),
          participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
          members: [
            { userId: new Types.ObjectId(userAId), role: 'MEMBER' },
            { userId: new Types.ObjectId(userBId), role: 'MEMBER' },
          ],
        }),
      );

      // Non-author attempting delete for everyone fails
      await expect(
        messagingService.deleteMessage(userBId, msgId, 'everyone'),
      ).rejects.toThrow(ForbiddenException);

      // Author delete for everyone succeeds
      const res = await messagingService.deleteMessage(userAId, msgId, 'everyone');
      expect(res.success).toBe(true);
      expect(mockMsg.isDeleted).toBe(true);
    });
  });

  describe('6. Group Chat Foundation & Mute/Archive', () => {
    it('creates group conversation with title and active members', async () => {
      const res = await messagingService.createGroupConversation(userAId, {
        name: 'BIM Specialists Group',
        participantIds: [userBId, userCId],
      });

      expect(mockConversationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GROUP',
          name: 'BIM Specialists Group',
          createdBy: expect.any(Types.ObjectId),
          members: expect.arrayContaining([
            expect.objectContaining({ role: 'ADMIN' }),
            expect.objectContaining({ role: 'MEMBER' }),
          ]),
        }),
      );
    });

    it('allows a member to leave a group', async () => {
      const convId = new Types.ObjectId().toString();
      const mockConv = {
        _id: new Types.ObjectId(convId),
        type: 'GROUP',
        participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
        members: [
          { userId: new Types.ObjectId(userAId), status: 'ACTIVE' },
          { userId: new Types.ObjectId(userBId), status: 'ACTIVE' },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockImplementation(() => makeQuery(mockConv));

      const res = await messagingService.leaveGroup(userAId, convId);
      expect(res.success).toBe(true);
      expect(mockConv.members.some((m: any) => m.userId.equals(new Types.ObjectId(userAId)))).toBe(false);
      expect(mockConv.participants.some((p: any) => p.equals(new Types.ObjectId(userAId)))).toBe(false);
    });

    it('mutes and unarchives conversation for member correctly', async () => {
      const convId = new Types.ObjectId().toString();
      const mockConv = {
        _id: new Types.ObjectId(convId),
        participants: [new Types.ObjectId(userAId)],
        members: [
          { userId: new Types.ObjectId(userAId), mutedUntil: null, isArchived: true },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockConversationModel.findById.mockImplementation(() => makeQuery(mockConv));

      await messagingService.muteConversation(userAId, convId, { muted: true });
      expect(mockConv.members[0].mutedUntil).toBeDefined();

      await messagingService.archiveConversation(userAId, convId, { archived: false });
      expect(mockConv.members[0].isArchived).toBe(false);
    });
  });
});
