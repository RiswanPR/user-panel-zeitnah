import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  let mockProfileService: any;

  beforeEach(async () => {
    mockProfileService = {
      getUsernameStatus: jest
        .fn()
        .mockResolvedValue({ username: 'riswan', usernameClaimed: true }),
      checkAvailability: jest
        .fn()
        .mockResolvedValue({ username: 'shahil', available: true }),
      claimUsername: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Claimed' }),
      changeUsername: jest.fn().mockResolvedValue({
        success: true,
        message: 'Username updated successfully',
      }),
      getPublicProfile: jest
        .fn()
        .mockResolvedValue({ user: { username: 'riswan' } }),
      getMe: jest.fn(),
      updateProfile: jest.fn(),
      uploadAvatar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return username status for authenticated user', async () => {
    const res = await controller.getUsernameStatus({ user: { userId: '123' } });
    expect(res.username).toBe('riswan');
    expect(res.usernameClaimed).toBe(true);
  });

  it('should check username availability', async () => {
    const res = await controller.checkUsername('shahil', {
      user: { userId: '123' },
    });
    expect(res.available).toBe(true);
    expect(mockProfileService.checkAvailability).toHaveBeenCalledWith(
      'shahil',
      '123',
    );
  });

  it('should claim username for authenticated user', async () => {
    const req = { user: { userId: '123' }, ip: '127.0.0.1' };
    const res = await controller.claimUsername(req, { username: 'new_handle' });
    expect(res.success).toBe(true);
    expect(mockProfileService.claimUsername).toHaveBeenCalledWith(
      '123',
      'new_handle',
      '127.0.0.1',
    );
  });

  it('should change username for authenticated user', async () => {
    const req = { user: { userId: '123' }, ip: '127.0.0.1' };
    const res = await controller.changeUsername(req, {
      username: 'updated_handle',
    });
    expect(res.success).toBe(true);
    expect(mockProfileService.changeUsername).toHaveBeenCalledWith(
      '123',
      'updated_handle',
      '127.0.0.1',
    );
  });

  it('should return public student profile', async () => {
    const res = await controller.getPublicProfile('riswan');
    expect(res.user.username).toBe('riswan');
    expect(mockProfileService.getPublicProfile).toHaveBeenCalledWith('riswan');
  });

  it('should return public student profile by ObjectId', async () => {
    const objectId = '6ab4efe2f762d65012683bac';
    mockProfileService.getPublicProfile.mockResolvedValueOnce({
      user: { id: objectId, username: 'rahulk', name: 'Rahul Kumar' },
    });
    const res = await controller.getPublicProfile(objectId);
    expect(res.user.id).toBe(objectId);
    expect(mockProfileService.getPublicProfile).toHaveBeenCalledWith(objectId);
  });
});
