/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.schema';
import { NotificationPreference } from './notification-preference.schema';
import { User } from '../auth/schemas/user.schema';
import { NotificationsGateway } from './notifications.gateway';
import { Types } from 'mongoose';

describe('NotificationsService - Lifecycle & Preferences', () => {
  let service: NotificationsService;

  const userId = new Types.ObjectId();
  const notifId = new Types.ObjectId();

  const mockNotificationModel: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockPrefModel: any = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockGateway = {
    sendNotificationToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: getModelToken(NotificationPreference.name),
          useValue: mockPrefModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications and accurate unread count', async () => {
      const mockNotifs = [
        { _id: notifId, title: 'New announcement', isRead: false },
      ];

      mockNotificationModel.countDocuments
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const sortSpy = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockNotifs),
          }),
        }),
      });

      mockNotificationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: sortSpy,
        }),
      });

      const result = await service.getUserNotifications(userId.toHexString(), {
        page: 1,
        limit: 20,
      });
      expect(sortSpy).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
      expect(result.notifications).toEqual(mockNotifs);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and return updated unread count', async () => {
      const mockDoc = {
        _id: notifId,
        recipientId: userId,
        isRead: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockNotificationModel.findOne.mockResolvedValue(mockDoc);
      mockNotificationModel.countDocuments.mockResolvedValue(0);

      const result = await service.markAsRead(
        notifId.toHexString(),
        userId.toHexString(),
      );
      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(0);
      expect(mockDoc.isRead).toBe(true);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if notification does not belong to user or does not exist', async () => {
      mockNotificationModel.findOne.mockResolvedValue(null);

      await expect(
        service.markAsRead(notifId.toHexString(), userId.toHexString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read and return unreadCount: 0', async () => {
      mockNotificationModel.updateMany.mockResolvedValue({
        matchedCount: 3,
        modifiedCount: 3,
      });

      const result = await service.markAllAsRead(userId.toHexString());
      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(0);
      expect(mockNotificationModel.updateMany).toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should create default preferences if none exist for user', async () => {
      mockPrefModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const defaultPrefs = {
        userId,
        emailNotifications: true,
        inAppNotifications: true,
      };
      mockPrefModel.create.mockResolvedValue(defaultPrefs);

      const result = await service.getPreferences(userId.toHexString());
      expect(result).toEqual(defaultPrefs);
      expect(mockPrefModel.create).toHaveBeenCalled();
    });
  });

  describe('getInAppOptedOutUserIds', () => {
    it('returns empty set if given empty userIds array', async () => {
      const result = await service.getInAppOptedOutUserIds([]);
      expect(result.size).toBe(0);
      expect(mockPrefModel.find).not.toHaveBeenCalled();
    });

    it('performs batched query with $in and returns set of opted-out string userIds', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const userC = new Types.ObjectId();

      mockPrefModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { userId: userB },
          ]),
        }),
      });

      const result = await service.getInAppOptedOutUserIds([userA, userB, userC]);

      expect(mockPrefModel.find).toHaveBeenCalledWith({
        userId: { $in: [userA, userB, userC] },
        inAppNotifications: false,
      });
      expect(result.has(userB.toHexString())).toBe(true);
      expect(result.has(userA.toHexString())).toBe(false);
      expect(result.has(userC.toHexString())).toBe(false);
    });

    it('preserves default opt-in when no preference documents exist or inAppNotifications is true', async () => {
      const userA = new Types.ObjectId();

      mockPrefModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getInAppOptedOutUserIds([userA]);
      expect(result.size).toBe(0);
    });

    it('deduplicates recipient IDs and safely skips malformed or null IDs', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();

      mockPrefModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ userId: userA }]),
        }),
      });

      const result = await service.getInAppOptedOutUserIds([
        userA,
        userA.toHexString(), // duplicate
        'invalid-id-format',
        null as any,
        undefined as any,
        userB,
      ]);

      expect(mockPrefModel.find).toHaveBeenCalledTimes(1);
      const queriedIds = mockPrefModel.find.mock.calls[0][0].userId.$in;
      expect(queriedIds).toHaveLength(2);
      expect(result.size).toBe(1);
      expect(result.has(userA.toHexString())).toBe(true);
    });

    it('splits queries into bounded chunks when userIds count exceeds chunk threshold (1000)', async () => {
      // 2,500 unique valid ObjectIds
      const ids = Array.from({ length: 2500 }, () => new Types.ObjectId());

      mockPrefModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getInAppOptedOutUserIds(ids);

      // 2500 items / 1000 chunk size = 3 chunks (1000, 1000, 500)
      expect(mockPrefModel.find).toHaveBeenCalledTimes(3);
      expect(mockPrefModel.find.mock.calls[0][0].userId.$in).toHaveLength(1000);
      expect(mockPrefModel.find.mock.calls[1][0].userId.$in).toHaveLength(1000);
      expect(mockPrefModel.find.mock.calls[2][0].userId.$in).toHaveLength(500);
      expect(result.size).toBe(0);
    });

    it('combines opted-out recipients across multiple chunks while preserving default opt-in', async () => {
      const userChunk1 = new Types.ObjectId();
      const userChunk2 = new Types.ObjectId();
      const allIds = Array.from({ length: 1500 }, () => new Types.ObjectId());
      allIds[10] = userChunk1;
      allIds[1200] = userChunk2;

      let callCount = 0;
      mockPrefModel.find.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return [{ userId: userChunk1 }];
            if (callCount === 2) return [{ userId: userChunk2 }];
            return [];
          }),
        }),
      }));

      const result = await service.getInAppOptedOutUserIds(allIds);

      expect(mockPrefModel.find).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(2);
      expect(result.has(userChunk1.toHexString())).toBe(true);
      expect(result.has(userChunk2.toHexString())).toBe(true);
    });
  });

  describe('createNotificationsBatch', () => {
    it('returns empty array when given empty dtos array', async () => {
      const result = await service.createNotificationsBatch([]);
      expect(result).toEqual([]);
      expect(mockNotificationModel.insertMany).not.toHaveBeenCalled();
    });

    it('bulk inserts notifications in bounded chunks, preserving metadata, timestamps, and schema defaults', async () => {
      const recipient1 = new Types.ObjectId();
      const recipient2 = new Types.ObjectId();
      const actor = new Types.ObjectId();
      const orgId = new Types.ObjectId().toHexString();

      const dtos = [
        {
          recipientId: recipient1,
          actorId: actor,
          type: 'company_post',
          category: 'community',
          priority: 'NORMAL',
          title: 'New post from Acme Corp',
          message: 'Check out our new update',
          targetUrl: `/community?organizationId=${orgId}`,
          actionUrl: `/community?organizationId=${orgId}`,
          idempotencyKey: `company_post_p1_${recipient1.toHexString()}`,
          metadata: { organizationId: orgId, postId: 'p1' },
        },
        {
          recipientId: recipient2,
          actorId: actor,
          type: 'company_post',
          category: 'community',
          priority: 'NORMAL',
          title: 'New post from Acme Corp',
          message: 'Check out our new update',
          targetUrl: `/community?organizationId=${orgId}`,
          actionUrl: `/community?organizationId=${orgId}`,
          idempotencyKey: `company_post_p1_${recipient2.toHexString()}`,
          metadata: { organizationId: orgId, postId: 'p1' },
        },
      ];

      const insertedRecords = dtos.map((d) => ({
        ...d,
        _id: new Types.ObjectId(),
        isRead: false,
        createdAt: new Date(),
        toObject: () => ({ ...d, _id: new Types.ObjectId() }),
      }));

      mockNotificationModel.insertMany.mockResolvedValue(insertedRecords);

      const result = await service.createNotificationsBatch(dtos);

      expect(mockNotificationModel.insertMany).toHaveBeenCalledTimes(1);
      expect(mockNotificationModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipientId: recipient1,
            actorId: actor,
            type: 'company_post',
            category: 'community',
            priority: 'NORMAL',
            title: 'New post from Acme Corp',
            metadata: { organizationId: orgId, postId: 'p1' },
            isRead: false,
          }),
        ]),
        { ordered: false },
      );
      expect(result).toEqual(insertedRecords);

      // Sockets should be emitted for each successfully inserted record
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledTimes(2);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        recipient1.toHexString(),
        expect.objectContaining({ title: 'New post from Acme Corp' }),
      );
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        recipient2.toHexString(),
        expect.objectContaining({ title: 'New post from Acme Corp' }),
      );
    });

    it('handles duplicate key errors (11000 / MongoBulkWriteError) gracefully and emits socket events ONLY for successfully inserted documents', async () => {
      const recipient1 = new Types.ObjectId();
      const recipient2 = new Types.ObjectId();

      const dtos = [
        {
          recipientId: recipient1,
          type: 'company_post',
          title: 'Test Duplicate',
          message: 'Hello',
          idempotencyKey: 'dup_key_1',
        },
        {
          recipientId: recipient2,
          type: 'company_post',
          title: 'Test Success',
          message: 'World',
          idempotencyKey: 'new_key_2',
        },
      ];

      const successDoc = {
        _id: new Types.ObjectId(),
        recipientId: recipient2,
        type: 'company_post',
        title: 'Test Success',
        message: 'World',
        idempotencyKey: 'new_key_2',
        toObject: () => ({
          recipientId: recipient2,
          title: 'Test Success',
        }),
      };

      const bulkError: any = new Error('E11000 duplicate key error');
      bulkError.code = 11000;
      bulkError.name = 'MongoBulkWriteError';
      bulkError.insertedDocs = [successDoc];

      mockNotificationModel.insertMany.mockRejectedValue(bulkError);

      const result = await service.createNotificationsBatch(dtos);

      expect(result).toEqual([successDoc]);
      // Sockets should ONLY be emitted for recipient2 (success), NOT recipient1 (duplicate)
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledTimes(1);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        recipient2.toHexString(),
        expect.objectContaining({ title: 'Test Success' }),
      );
    });

    it('handles total duplicate-key failure (0 insertedDocs) without throwing and emits zero sockets', async () => {
      const recipient1 = new Types.ObjectId();
      const dtos = [
        {
          recipientId: recipient1,
          type: 'company_post',
          title: 'Duplicate',
          message: 'Msg',
          idempotencyKey: 'dup_1',
        },
      ];

      const bulkError: any = new Error('E11000 duplicate key error collection');
      bulkError.code = 11000;
      bulkError.name = 'MongoBulkWriteError';
      bulkError.insertedDocs = [];

      mockNotificationModel.insertMany.mockRejectedValue(bulkError);

      const result = await service.createNotificationsBatch(dtos);

      expect(result).toEqual([]);
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('chunks notifications in bounded batches when exceeding chunk size', async () => {
      const dtos = Array.from({ length: 5 }, (_, i) => ({
        recipientId: new Types.ObjectId(),
        type: 'company_post',
        title: `Chunk item ${i}`,
        message: 'Content',
      }));

      mockNotificationModel.insertMany.mockImplementation((chunk) =>
        Promise.resolve(chunk.map((c: any) => ({ ...c, _id: new Types.ObjectId() }))),
      );

      // Call with chunkSize = 2
      const result = await service.createNotificationsBatch(dtos, 2);

      // 5 items with chunk size 2 -> 3 chunks: [2, 2, 1]
      expect(mockNotificationModel.insertMany).toHaveBeenCalledTimes(3);
      expect(result.length).toBe(5);
    });

    it('handles mixed valid and invalid recipient IDs by safely skipping invalid IDs without aborting', async () => {
      const validRecipient = new Types.ObjectId();
      const dtos = [
        {
          recipientId: 'invalid-hex-id-format',
          type: 'company_post',
          title: 'Invalid recipient',
          message: 'Will be skipped',
        },
        {
          recipientId: validRecipient,
          type: 'company_post',
          title: 'Valid recipient',
          message: 'Will be inserted',
        },
      ];

      const insertedDoc = {
        _id: new Types.ObjectId(),
        recipientId: validRecipient,
        type: 'company_post',
        title: 'Valid recipient',
        message: 'Will be inserted',
        toObject: () => ({ recipientId: validRecipient, title: 'Valid recipient' }),
      };

      mockNotificationModel.insertMany.mockResolvedValue([insertedDoc]);

      const result = await service.createNotificationsBatch(dtos);

      expect(mockNotificationModel.insertMany).toHaveBeenCalledTimes(1);
      const insertedChunk = mockNotificationModel.insertMany.mock.calls[0][0];
      expect(insertedChunk).toHaveLength(1);
      expect(insertedChunk[0].recipientId).toEqual(validRecipient);

      expect(result).toEqual([insertedDoc]);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledTimes(1);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        validRecipient.toHexString(),
        expect.objectContaining({ title: 'Valid recipient' }),
      );
    });

    it('safely returns empty array for an entirely invalid batch without calling insertMany or gateway', async () => {
      const dtos = [
        { recipientId: 'bad-id-1', title: 'Bad 1', message: 'M1', type: 'system' },
        { recipientId: '', title: 'Bad 2', message: 'M2', type: 'system' },
        { recipientId: null as any, title: 'Bad 3', message: 'M3', type: 'system' },
      ];

      const result = await service.createNotificationsBatch(dtos);

      expect(result).toEqual([]);
      expect(mockNotificationModel.insertMany).not.toHaveBeenCalled();
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('safely ignores invalid optional actorId or entityId format without aborting notification', async () => {
      const validRecipient = new Types.ObjectId();
      const dtos = [
        {
          recipientId: validRecipient,
          actorId: 'invalid-actor-id',
          entityId: 'invalid-entity-id',
          type: 'company_post',
          title: 'Optional field test',
          message: 'Valid with cleaned optional refs',
        },
      ];

      const insertedDoc = {
        _id: new Types.ObjectId(),
        recipientId: validRecipient,
        type: 'company_post',
        title: 'Optional field test',
        message: 'Valid with cleaned optional refs',
        toObject: () => ({ recipientId: validRecipient, title: 'Optional field test' }),
      };

      mockNotificationModel.insertMany.mockResolvedValue([insertedDoc]);

      const result = await service.createNotificationsBatch(dtos);

      expect(mockNotificationModel.insertMany).toHaveBeenCalledTimes(1);
      const chunk = mockNotificationModel.insertMany.mock.calls[0][0];
      expect(chunk[0].actorId).toBeUndefined();
      expect(chunk[0].entityId).toBeUndefined();
      expect(result).toEqual([insertedDoc]);
    });

    it('handles MongooseBulkWriteError (validation failures) and recovers confirmed persisted docs from results', async () => {
      const validRecipient = new Types.ObjectId();
      const dtos = [
        { recipientId: new Types.ObjectId(), title: 'Doc 1', message: 'M1', type: 'general' },
        { recipientId: validRecipient, title: 'Doc 2', message: 'M2', type: 'general' },
      ];

      const validationErr = new Error('Path `title` is required.');
      validationErr.name = 'ValidationError';

      const successDoc = {
        _id: new Types.ObjectId(),
        recipientId: validRecipient,
        title: 'Doc 2',
        message: 'M2',
        type: 'general',
        isNew: false,
        toObject: () => ({ recipientId: validRecipient, title: 'Doc 2', message: 'M2' }),
      };

      const mongooseBulkError: any = new Error(
        'insertMany failed with 1 Mongoose validation errors',
      );
      mongooseBulkError.name = 'MongooseBulkWriteError';
      mongooseBulkError.validationErrors = [validationErr];
      mongooseBulkError.results = [validationErr, successDoc];
      mongooseBulkError.rawResult = {
        insertedCount: 1,
        acknowledged: true,
        insertedIds: { 1: successDoc._id },
      };

      mockNotificationModel.insertMany.mockRejectedValue(mongooseBulkError);

      const result = await service.createNotificationsBatch(dtos);

      expect(result).toEqual([successDoc]);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledTimes(1);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        validRecipient.toHexString(),
        expect.objectContaining({ title: 'Doc 2' }),
      );
    });

    it('does not treat a result object as persisted merely because it has _id and recipientId', async () => {
      const recipient = new Types.ObjectId();
      const unverifiedDoc = {
        _id: new Types.ObjectId(),
        recipientId: recipient,
        title: 'Unverified In-Memory Object',
        message: 'Has _id and recipientId but was not persisted',
        type: 'general',
        isNew: true, // Not persisted to MongoDB
        toObject: () => ({ recipientId: recipient, title: 'Unverified In-Memory Object' }),
      };

      // Generic error with results array but no insertedDocs, no MongooseBulkWriteError
      const genericError: any = new Error('Generic unverified write error');
      genericError.results = [unverifiedDoc];

      mockNotificationModel.insertMany.mockRejectedValue(genericError);

      const dtos = [
        { recipientId: recipient, title: 'Test', message: 'Content', type: 'general' },
      ];

      const result = await service.createNotificationsBatch(dtos);

      expect(result).toEqual([]);
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('does not emit phantom sockets when aggregate insertedCount > 0 lacks reliable per-document evidence', async () => {
      const recipient = new Types.ObjectId();
      const unconfirmedDoc = {
        _id: new Types.ObjectId(),
        recipientId: recipient,
        title: 'Unconfirmed Doc',
        message: 'Has no isNew: false and no insertedIds match',
        type: 'general',
        // isNew is true (or undefined), and rawResult has no insertedIds matching this _id
        toObject: () => ({ recipientId: recipient, title: 'Unconfirmed Doc' }),
      };

      const validationErr = new Error('Validation failed');
      validationErr.name = 'ValidationError';

      const mongooseBulkError: any = new Error('insertMany failed with validation errors');
      mongooseBulkError.name = 'MongooseBulkWriteError';
      mongooseBulkError.validationErrors = [validationErr];
      mongooseBulkError.results = [validationErr, unconfirmedDoc];
      // Aggregate insertedCount is positive, but no insertedIds and no isNew === false
      mongooseBulkError.rawResult = { insertedCount: 1, acknowledged: true };

      mockNotificationModel.insertMany.mockRejectedValue(mongooseBulkError);

      const dtos = [
        { recipientId: new Types.ObjectId(), title: 'Bad', message: 'M', type: 'general' },
        { recipientId: recipient, title: 'Unconfirmed', message: 'M', type: 'general' },
      ];

      const result = await service.createNotificationsBatch(dtos);

      // Must be safely rejected to prevent phantom socket events
      expect(result).toEqual([]);
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('handles MongooseBulkWriteError when entire batch fails validation without emitting sockets', async () => {
      const validationErr = new Error('Validation failed');
      validationErr.name = 'ValidationError';

      const mongooseBulkError: any = new Error('insertMany failed with validation errors');
      mongooseBulkError.name = 'MongooseBulkWriteError';
      mongooseBulkError.validationErrors = [validationErr];
      mongooseBulkError.results = [validationErr];
      mongooseBulkError.rawResult = null;

      mockNotificationModel.insertMany.mockRejectedValue(mongooseBulkError);

      const dtos = [
        { recipientId: new Types.ObjectId(), title: 'Test', message: 'Content', type: 'system' },
      ];

      const result = await service.createNotificationsBatch(dtos);

      expect(result).toEqual([]);
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });

    it('handles mixed validation and duplicate-key failures by extracting only confirmed persisted documents', async () => {
      const validRecipient = new Types.ObjectId();
      const dtos = [
        { recipientId: new Types.ObjectId(), title: 'Val error', message: 'M', type: 't' },
        { recipientId: new Types.ObjectId(), title: 'Dup key', message: 'M', type: 't' },
        { recipientId: validRecipient, title: 'Success', message: 'M', type: 't' },
      ];

      const validationErr = new Error('Validation failure');
      validationErr.name = 'ValidationError';
      const duplicateWriteErr = {
        code: 11000,
        index: 1,
        errmsg: 'E11000 duplicate key error collection',
      };

      const successDoc = {
        _id: new Types.ObjectId(),
        recipientId: validRecipient,
        title: 'Success',
        message: 'M',
        type: 't',
        isNew: false,
        toObject: () => ({ recipientId: validRecipient, title: 'Success' }),
      };

      const mixedError: any = new Error('Bulk write error with mixed failures');
      mixedError.name = 'MongooseBulkWriteError';
      mixedError.validationErrors = [validationErr];
      mixedError.results = [validationErr, duplicateWriteErr, successDoc];
      mixedError.rawResult = {
        insertedCount: 1,
        acknowledged: true,
        insertedIds: { 2: successDoc._id },
      };

      mockNotificationModel.insertMany.mockRejectedValue(mixedError);

      const result = await service.createNotificationsBatch(dtos);

      // Only successDoc should be extracted, neither validationErr nor duplicateWriteErr
      expect(result).toEqual([successDoc]);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledTimes(1);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        validRecipient.toHexString(),
        expect.objectContaining({ title: 'Success' }),
      );
    });

    it('never attempts batch-wide single-notification retry after partial failure', async () => {
      const createNotificationSpy = jest.spyOn(service, 'createNotification');

      const bulkError: any = new Error('MongoBulkWriteError');
      bulkError.name = 'MongoBulkWriteError';
      bulkError.code = 11000;
      bulkError.insertedDocs = [];

      mockNotificationModel.insertMany.mockRejectedValue(bulkError);

      const dtos = [
        { recipientId: new Types.ObjectId(), title: 'No retry test', message: 'M', type: 'system' },
      ];

      await service.createNotificationsBatch(dtos);

      // Must never fall back to single createNotification calls
      expect(createNotificationSpy).not.toHaveBeenCalled();
    });
  });
});
