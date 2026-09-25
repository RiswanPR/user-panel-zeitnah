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
  };

  const mockPrefModel = {
    findOne: jest.fn(),
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

      mockNotificationModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockNotifs),
              }),
            }),
          }),
        }),
      });

      mockNotificationModel.countDocuments
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.getUserNotifications(userId.toHexString(), {
        page: 1,
        limit: 20,
      });
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
});
