import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      registerPushToken: jest.fn().mockResolvedValue({ success: true, message: 'registered' }),
      removePushToken: jest.fn().mockResolvedValue({ success: true, message: 'removed' }),
      getPushDevices: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register push token', async () => {
    const req = { user: { userId: 'user-1' } };
    const dto = { deviceId: 'dev-1', pushToken: 'token-abc', platform: 'android' as const };
    const res = await controller.registerPushToken(req, dto);
    expect(mockService.registerPushToken).toHaveBeenCalledWith('user-1', dto);
    expect(res).toEqual({ success: true, message: 'registered' });
  });

  it('should remove push token', async () => {
    const req = { user: { userId: 'user-1' } };
    const res = await controller.removePushToken(req, 'dev-1');
    expect(mockService.removePushToken).toHaveBeenCalledWith('user-1', 'dev-1');
    expect(res).toEqual({ success: true, message: 'removed' });
  });

  it('should get push devices', async () => {
    const req = { user: { userId: 'user-1' } };
    const res = await controller.getPushDevices(req);
    expect(mockService.getPushDevices).toHaveBeenCalledWith('user-1');
    expect(res).toEqual([]);
  });
});
