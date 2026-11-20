import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MessagingService } from './messaging.service';
import { MessagesGateway } from './messages.gateway';
import { ModerationService } from '../moderation/moderation.service';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';
import { SavedMessage } from './schemas/saved-message.schema';
import { User } from '../auth/schemas/user.schema';
import { NetworkConnection } from '../network/schemas/connection.schema';

describe('MessagingService — Direct Authorization Verification (isUserParticipant)', () => {
  let service: MessagingService;
  let mockConversationModel: {
    exists: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
  };

  const validConvId = '507f1f77bcf86cd799439011';
  const validUserId = '507f1f77bcf86cd799439022';

  beforeEach(async () => {
    mockConversationModel = {
      exists: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
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
          useValue: {},
        },
        {
          provide: getModelToken(SavedMessage.name),
          useValue: {},
        },
        {
          provide: getModelToken(User.name),
          useValue: {},
        },
        {
          provide: getModelToken(NetworkConnection.name),
          useValue: {},
        },
        {
          provide: ModerationService,
          useValue: {},
        },
        {
          provide: MessagesGateway,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isUserParticipant()', () => {
    it('✓ Returns true for valid string user ID when conversation exists with participant', async () => {
      mockConversationModel.exists.mockResolvedValue({
        _id: new Types.ObjectId(validConvId),
      });

      const result = await service.isUserParticipant(validConvId, validUserId);

      expect(mockConversationModel.exists).toHaveBeenCalledWith({
        _id: new Types.ObjectId(validConvId),
        participants: new Types.ObjectId(validUserId),
      });
      expect(result).toBe(true);
    });

    it('✓ Returns true for valid ObjectId user ID when conversation exists with participant', async () => {
      const convObjId = new Types.ObjectId(validConvId);
      const userObjId = new Types.ObjectId(validUserId);

      mockConversationModel.exists.mockResolvedValue({
        _id: convObjId,
      });

      const result = await service.isUserParticipant(
        convObjId.toHexString(),
        userObjId.toHexString(),
      );

      expect(mockConversationModel.exists).toHaveBeenCalledWith({
        _id: convObjId,
        participants: userObjId,
      });
      expect(result).toBe(true);
    });

    it('✓ Returns false when conversation exists but user is not in participants list', async () => {
      mockConversationModel.exists.mockResolvedValue(null);

      const result = await service.isUserParticipant(validConvId, validUserId);

      expect(mockConversationModel.exists).toHaveBeenCalledWith({
        _id: new Types.ObjectId(validConvId),
        participants: new Types.ObjectId(validUserId),
      });
      expect(result).toBe(false);
    });

    it('✓ Returns false when conversation does not exist', async () => {
      mockConversationModel.exists.mockResolvedValue(null);

      const nonExistentConvId = '507f1f77bcf86cd799439099';
      const result = await service.isUserParticipant(
        nonExistentConvId,
        validUserId,
      );

      expect(result).toBe(false);
    });

    it('✓ Returns false for invalid conversation ID formats without hitting database', async () => {
      expect(
        await service.isUserParticipant('invalid-conv-id', validUserId),
      ).toBe(false);
      expect(await service.isUserParticipant('', validUserId)).toBe(false);
      expect(await service.isUserParticipant(null as any, validUserId)).toBe(
        false,
      );
      expect(
        await service.isUserParticipant(undefined as any, validUserId),
      ).toBe(false);
      expect(mockConversationModel.exists).not.toHaveBeenCalled();
    });

    it('✓ Returns false for invalid user ID formats without hitting database', async () => {
      expect(
        await service.isUserParticipant(validConvId, 'not-a-valid-user-id'),
      ).toBe(false);
      expect(await service.isUserParticipant(validConvId, '')).toBe(false);
      expect(await service.isUserParticipant(validConvId, null as any)).toBe(
        false,
      );
      expect(mockConversationModel.exists).not.toHaveBeenCalled();
    });

    it('✓ Returns false and fails closed when database throws an exception', async () => {
      mockConversationModel.exists.mockRejectedValue(
        new Error('MongoDB cluster unreachable / network timeout'),
      );

      const result = await service.isUserParticipant(validConvId, validUserId);

      expect(result).toBe(false);
    });
  });
});
