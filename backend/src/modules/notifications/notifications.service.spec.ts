import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { User } from '../auth/schemas/user.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockUserModel: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

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

    it('should update existing device token if deviceId already registered', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: 'user123',
        pushDevices: [
          {
            deviceId: 'device-abc',
            pushToken: 'old-token',
            platform: 'android',
            enabled: true,
          },
        ],
      });

      const result = await service.registerPushToken('user123', {
        deviceId: 'device-abc',
        pushToken: 'new-updated-token',
        platform: 'android',
      });

      expect(result.success).toBe(true);
      expect(mockUserModel.updateOne).toHaveBeenCalled();
    });

    it('should return error if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await service.registerPushToken('nonexistent', {
        deviceId: 'device-abc',
        pushToken: 'fcm-token-xyz',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
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

  describe('getPushDevices', () => {
    it('should return registered push devices for user', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          pushDevices: [
            { deviceId: 'device-1', pushToken: 'token-1', platform: 'ios', enabled: true },
          ],
        }),
      });

      const devices = await service.getPushDevices('user123');
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device-1');
    });
  });

  describe('sendNotification', () => {
    it('should emit socket event and process push devices', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          pushDevices: [
            { deviceId: 'device-1', pushToken: 'token-1', platform: 'android', enabled: true },
          ],
        }),
      });

      await service.sendNotification('user123', {
        title: 'New Lesson Available',
        body: 'Chapter 3: Advanced React has been published',
        type: 'LESSON_RELEASED',
        deepLink: 'zeitnah://courses/c-123',
      });

      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          title: 'New Lesson Available',
          type: 'LESSON_RELEASED',
        }),
      );
    });
  });
});
