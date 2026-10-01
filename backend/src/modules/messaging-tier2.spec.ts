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
import { MessagesGateway } from './messaging/messages.gateway';
import {
  Conversation,
  ConversationType,
} from './messaging/schemas/conversation.schema';
import { Message } from './messaging/schemas/message.schema';
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

describe('Messaging Tier 2 — Intelligence, Saved & Pinned Messages, and Search QA Suite', () => {
  let messagingService: MessagingService;
  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockSavedMessageModel: any;
  let mockUserModel: any;
  let mockConnectionModel: any;
  let mockModerationService: any;
  let mockMessagesGateway: any;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const strangerId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockConversationModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockMessageModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      findOne: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockSavedMessageModel = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockImplementation(() => makeQuery([])),
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          savedAt: new Date(),
          ...dto,
        }),
      ),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockUserModel = {
      findById: jest.fn().mockImplementation(() => makeQuery(null)),
      find: jest.fn().mockImplementation(() => makeQuery([])),
    };

    mockConnectionModel = {
      find: jest.fn().mockImplementation(() => makeQuery([])),
    };

    mockModerationService = {
      hasBlockRelationship: jest.fn().mockResolvedValue(false),
    };

    mockMessagesGateway = {
      notifyMessageUpdated: jest.fn(),
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        { provide: getModelToken(Message.name), useValue: mockMessageModel },
        {
          provide: getModelToken(SavedMessage.name),
          useValue: mockSavedMessageModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(NetworkConnection.name),
          useValue: mockConnectionModel,
        },
        { provide: ModerationService, useValue: mockModerationService },
        { provide: MessagesGateway, useValue: mockMessagesGateway },
      ],
    }).compile();

    messagingService = module.get<MessagingService>(MessagingService);
  });

  describe('1. Saved Messages Operations', () => {
    it('saves a valid message for conversation member', async () => {
      const convId = new Types.ObjectId();
      const msgId = new Types.ObjectId();

      mockMessageModel.findById.mockImplementation(() =>
        makeQuery({
          _id: msgId,
          conversationId: convId,
          body: 'Architecture blueprint document',
          isDeleted: false,
        }),
      );

      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: convId,
          participants: [
            new Types.ObjectId(userAId),
            new Types.ObjectId(userBId),
          ],
        }),
      );

      const res = await messagingService.saveMessage(userAId, msgId.toString());
      expect(res.success).toBe(true);
      expect(res.isSaved).toBe(true);
      expect(mockSavedMessageModel.create).toHaveBeenCalled();
    });

    it('rejects saving a message from a conversation user does not belong to', async () => {
      const convId = new Types.ObjectId();
      const msgId = new Types.ObjectId();

      mockMessageModel.findById.mockImplementation(() =>
        makeQuery({
          _id: msgId,
          conversationId: convId,
          body: 'Confidential message',
          isDeleted: false,
        }),
      );

      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: convId,
          participants: [
            new Types.ObjectId(userAId),
            new Types.ObjectId(userBId),
          ],
        }),
      );

      await expect(
        messagingService.saveMessage(strangerId, msgId.toString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('unsaves an existing saved message', async () => {
      const msgId = new Types.ObjectId().toString();
      const res = await messagingService.unsaveMessage(userAId, msgId);
      expect(res.success).toBe(true);
      expect(res.isSaved).toBe(false);
      expect(mockSavedMessageModel.deleteOne).toHaveBeenCalled();
    });
  });

  describe('2. Pinned Messages Operations', () => {
    it('allows a member to pin a message in direct conversation', async () => {
      const convId = new Types.ObjectId();
      const msgId = new Types.ObjectId();
      const saveFn = jest.fn().mockResolvedValue(true);

      const mockMsgDoc: any = {
        _id: msgId,
        conversationId: convId,
        senderId: new Types.ObjectId(userBId),
        body: 'Please review before tomorrow',
        isDeleted: false,
        isPinned: false,
        save: saveFn,
      };

      mockConversationModel.findById.mockResolvedValue({
        _id: convId,
        type: ConversationType.DIRECT,
        participants: [
          new Types.ObjectId(userAId),
          new Types.ObjectId(userBId),
        ],
      });

      mockMessageModel.findById.mockImplementation((id: any) => {
        if (id.equals ? id.equals(msgId) : String(id) === msgId.toString()) {
          return mockMsgDoc;
        }
        return makeQuery(null);
      });

      mockMessageModel.findById.mockReturnValue(mockMsgDoc);

      const res = await messagingService.pinMessage(
        userAId,
        convId.toString(),
        msgId.toString(),
      );
      expect(saveFn).toHaveBeenCalled();
      expect(mockMsgDoc.isPinned).toBe(true);
    });

    it('in group conversations, forbids non-admin non-author from pinning', async () => {
      const convId = new Types.ObjectId();
      const msgId = new Types.ObjectId();
      const authorId = new Types.ObjectId(userBId);
      const memberId = new Types.ObjectId(userAId);

      const mockMsgDoc: any = {
        _id: msgId,
        conversationId: convId,
        senderId: authorId,
        body: 'Team updates',
        isDeleted: false,
        isPinned: false,
      };

      mockConversationModel.findById.mockResolvedValue({
        _id: convId,
        type: ConversationType.GROUP,
        createdBy: new Types.ObjectId(),
        participants: [memberId, authorId],
        members: [
          { userId: memberId, role: 'MEMBER' },
          { userId: authorId, role: 'ADMIN' },
        ],
      });

      mockMessageModel.findById.mockReturnValue(mockMsgDoc);

      await expect(
        messagingService.pinMessage(
          userAId,
          convId.toString(),
          msgId.toString(),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('in group conversations, allows group ADMIN to pin', async () => {
      const convId = new Types.ObjectId();
      const msgId = new Types.ObjectId();
      const authorId = new Types.ObjectId(userBId);
      const adminId = new Types.ObjectId(userAId);
      const saveFn = jest.fn().mockResolvedValue(true);

      const mockMsgDoc: any = {
        _id: msgId,
        conversationId: convId,
        senderId: authorId,
        body: 'Sprint goals',
        isDeleted: false,
        isPinned: false,
        save: saveFn,
      };

      mockConversationModel.findById.mockResolvedValue({
        _id: convId,
        type: ConversationType.GROUP,
        createdBy: adminId,
        participants: [adminId, authorId],
        members: [
          { userId: adminId, role: 'ADMIN' },
          { userId: authorId, role: 'MEMBER' },
        ],
      });

      mockMessageModel.findById.mockReturnValue(mockMsgDoc);

      const res = await messagingService.pinMessage(
        userAId,
        convId.toString(),
        msgId.toString(),
      );
      expect(mockMsgDoc.isPinned).toBe(true);
      expect(saveFn).toHaveBeenCalled();
    });
  });

  describe('3. Global Search & Conversation Isolation', () => {
    it('searches messages, files, and links strictly within user-accessible conversations', async () => {
      const accessibleConvId = new Types.ObjectId();
      const userObjId = new Types.ObjectId(userAId);

      mockConversationModel.find.mockImplementation(() =>
        makeQuery([
          {
            _id: accessibleConvId,
            type: ConversationType.DIRECT,
            participants: [userObjId, new Types.ObjectId(userBId)],
            members: [{ userId: userObjId, isDeletedFor: false }],
            lastMessage: { body: 'Project roadmap' },
          },
        ]),
      );

      mockMessageModel.find.mockImplementation((filter: any) => {
        expect(filter.conversationId.$in).toEqual([accessibleConvId]);
        return makeQuery([
          {
            _id: new Types.ObjectId(),
            conversationId: accessibleConvId,
            senderId: {
              _id: new Types.ObjectId(userBId),
              name: 'Sarah Connor',
            },
            body: 'Here is the project architecture roadmap',
            createdAt: new Date(),
          },
        ]);
      });

      const res = await messagingService.searchMessages(userAId, {
        q: 'roadmap',
        type: 'all',
      });

      expect(res.query).toBe('roadmap');
      expect(res.messages.length).toBeGreaterThan(0);
    });

    it('returns empty results gracefully when query is empty', async () => {
      const res = await messagingService.searchMessages(userAId, { q: '   ' });
      expect(res.conversations).toEqual([]);
      expect(res.messages).toEqual([]);
      expect(res.files).toEqual([]);
      expect(res.links).toEqual([]);
      expect(res.people).toEqual([]);
    });
  });

  describe('4. Historical Message Targeting (query.around)', () => {
    it('centers message query around target message without full history dump', async () => {
      const convId = new Types.ObjectId();
      const targetId = new Types.ObjectId();
      const userObjId = new Types.ObjectId(userAId);

      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: convId,
          participants: [userObjId, new Types.ObjectId(userBId)],
        }),
      );

      const targetMsg = {
        _id: targetId,
        conversationId: convId,
        body: 'Crucial specification comment',
        createdAt: new Date('2026-09-15T12:00:00Z'),
        isDeleted: false,
      };

      mockMessageModel.findOne.mockImplementation(() => makeQuery(targetMsg));
      mockMessageModel.find.mockImplementation(() => makeQuery([]));

      const res = await messagingService.getMessages(
        userAId,
        convId.toString(),
        {
          around: targetId.toString(),
          limit: 20,
        },
      );

      expect(res.targetMessageId).toBe(targetId.toString());
      expect(res.messages.some((m) => m.id === targetId.toString())).toBe(true);
    });
  });

  describe('5. Pinned Messages Retrieval & Authorization', () => {
    it('forbids retrieving pinned messages for non-members of conversation', async () => {
      const convId = new Types.ObjectId();
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: convId,
          participants: [
            new Types.ObjectId(userBId),
            new Types.ObjectId(strangerId),
          ],
        }),
      );

      await expect(
        messagingService.getPinnedMessages(userAId, convId.toString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns { pinned, count } for authorized conversation members', async () => {
      const convId = new Types.ObjectId();
      const userObjId = new Types.ObjectId(userAId);
      mockConversationModel.findById.mockImplementation(() =>
        makeQuery({
          _id: convId,
          participants: [userObjId, new Types.ObjectId(userBId)],
        }),
      );

      mockMessageModel.find.mockImplementation(() =>
        makeQuery([
          {
            _id: new Types.ObjectId(),
            conversationId: convId,
            senderId: { _id: userObjId, name: 'Alice' },
            body: 'Key pinned announcement',
            isPinned: true,
            isDeleted: false,
          },
        ]),
      );

      const res = await messagingService.getPinnedMessages(
        userAId,
        convId.toString(),
      );
      expect(res).toBeDefined();
      expect(Array.isArray(res.pinned)).toBe(true);
      expect(res.count).toBe(1);
      expect(res.pinned[0].isPinned).toBe(true);
      expect(res.pinned[0].isOwn).toBe(true);
    });
  });

  describe('6. Message Attachment Size Limit & Sanitization', () => {
    it('rejects attachment exceeding 25MB limit', async () => {
      const oversizedFile: any = {
        originalname: 'huge_archive.zip',
        mimetype: 'application/zip',
        size: 26 * 1024 * 1024,
        buffer: Buffer.alloc(100),
      };

      await expect(
        messagingService.uploadAttachment(userAId, oversizedFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('sanitizes filename and processes valid attachment within 25MB', async () => {
      mockUserModel.findById.mockImplementation(() =>
        makeQuery({ _id: new Types.ObjectId(userAId), name: 'Alice' }),
      );

      const validFile: any = {
        originalname: 'Project Blueprint <2026>?.pdf',
        mimetype: 'application/pdf',
        size: 5 * 1024 * 1024,
        buffer: Buffer.from('PDF_SAMPLE'),
      };

      const res = await messagingService.uploadAttachment(userAId, validFile);
      expect(res).toBeDefined();
      expect(res.size).toBe(5 * 1024 * 1024);
      expect(res.key).toMatch(/^messages\/attachments\//);
      expect(res.key).not.toContain('<');
      expect(res.key).not.toContain('?');
    });
  });
});
