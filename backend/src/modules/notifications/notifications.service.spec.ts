import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { User } from '../auth/schemas/user.schema';
import { Notification } from './schemas/notification.schema';
import { NotificationPreference } from './schemas/notification-preference.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockUserModel: any;
  let mockNotificationModel: any;
  let mockPreferenceModel: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockNotificationModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: 'notif-123',
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue({
        _id: 'notif-123',
        ...dto,
        createdAt: new Date(),
        populate: jest.fn().mockResolvedValue(true),
      }),
    }));
    mockNotificationModel.findOne = jest.fn();
    mockNotificationModel.find = jest.fn();
    mockNotificationModel.countDocuments = jest.fn();
    mockNotificationModel.updateMany = jest.fn();

    mockPreferenceModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      social: { inApp: true, email: true, push: true },
      learning: { inApp: true, email: true, push: true },
      course: { inApp: true, email: true, push: true },
      achievement: { inApp: true, email: false, push: true },
      community: { inApp: true, email: false, push: false },
      organization: { inApp: true, email: true, push: true },
      opportunity: { inApp: true, email: true, push: true },
      announcement: { inApp: true, email: true, push: true },
      security: { inApp: true, email: true, push: true },
      save: jest.fn().mockResolvedValue(true),
    }));
    mockPreferenceModel.findOne = jest.fn();

    mockGateway = {
      sendNotificationToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: getModelToken(NotificationPreference.name),
          useValue: mockPreferenceModel,
        },
        {
          provide: NotificationsGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create and emit a notification if preferences allow', async () => {
      mockNotificationModel.findOne.mockResolvedValue(null);
      mockPreferenceModel.findOne.mockResolvedValue({
        social: { inApp: true, email: false, push: false },
        security: { inApp: true, email: true, push: true },
      });

      const result = await service.createNotification({
        recipientId: '507f1f77bcf86cd799439011',
        actorId: '507f1f77bcf86cd799439012',
        type: 'connection.requested',
        category: 'social',
        priority: 'important',
        title: 'Alex sent you a connection request',
        message: 'You can review their profile and respond.',
        idempotencyKey: 'conn_req_1_2',
      });

      expect(result).toBeDefined();
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
          title: 'Alex sent you a connection request',
          category: 'social',
        }),
      );
    });

    it('should prevent duplicate notifications with the same idempotencyKey', async () => {
      const existingNotification = {
        _id: 'existing-123',
        idempotencyKey: 'conn_req_1_2',
        title: 'Already created',
      };
      mockNotificationModel.findOne.mockResolvedValue(existingNotification);

      const result = await service.createNotification({
        recipientId: '507f1f77bcf86cd799439011',
        type: 'connection.requested',
        category: 'social',
        title: 'Alex sent you a connection request',
        message: 'You can review their profile and respond.',
        idempotencyKey: 'conn_req_1_2',
      });

      expect(result).toEqual(existingNotification);
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });
  });

  describe('registerPushToken', () => {
    it('should register a new push token for a device', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: 'user123',
        pushDevices: [],
      });

      const result = await service.registerPushToken('user123', {
        deviceId: 'device-abc',
        pushToken: 'fcm-token-xyz',
        platform: 'android',
      });

      expect(result.success).toBe(true);
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: 'user123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            pushDevices: expect.arrayContaining([
              expect.objectContaining({
                deviceId: 'device-abc',
                pushToken: 'fcm-token-xyz',
                platform: 'android',
                enabled: true,
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('removePushToken', () => {
    it('should pull device from pushDevices on logout', async () => {
      const result = await service.removePushToken('user123', 'device-abc');
      expect(result.success).toBe(true);
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: 'user123' },
        { $pull: { pushDevices: { deviceId: 'device-abc' } } },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(5);
      const count = await service.getUnreadCount('507f1f77bcf86cd799439011');
      expect(count).toBe(5);
    });
  });
});
