import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './schemas/user.schema';
import { LoginHistoryService } from '../login-history/login-history.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsernameService } from '../profile/services/username.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resend } from '../../config/resend.config';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let usernameService: UsernameService;
  let auditLogsService: any;
  let jwtService: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      updateOne: jest
        .fn()
        .mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };

    auditLogsService = {
      record: jest.fn().mockResolvedValue({}),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn().mockReturnValue({
        userId: '507f1f77bcf86cd799439011',
        deviceId: 'dev_1',
      }),
    };

    // Spy on resend email send
    jest
      .spyOn(resend.emails, 'send')
      .mockResolvedValue({ data: { id: 'email_123' }, error: null } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsernameService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: LoginHistoryService,
          useValue: {
            recordLogin: jest.fn(),
            create: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usernameService = module.get<UsernameService>(UsernameService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginSendOtp', () => {
    it('should successfully repair an oversized username (muhammedthajchorampatta, 23 chars) to <= 20 chars and send OTP', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Muhammed Thaj Chorampatta',
        email: 'muhammedthajchorampatta@example.com',
        username: 'muhammedthajchorampatta', // 23 chars! Invalid according to schema!
      };

      userModel.findOne.mockResolvedValue(mockUser);
      userModel.exists.mockResolvedValue(null);

      const result = await service.loginSendOtp(
        'muhammedthajchorampatta@example.com',
      );

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockUser.username.length).toBeLessThanOrEqual(20);
      expect(usernameService.validate(mockUser.username).valid).toBe(true);
      expect(mockUser.otp).toBeDefined();
      expect(mockUser.otpExpiry).toBeDefined();
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            otp: mockUser.otp,
            otpExpiry: mockUser.otpExpiry,
          }),
        }),
      );
    });

    it('should resolve collision if truncated base username already exists', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Muhammed Thaj Chorampatta',
        email: 'muhammedthajchorampatta@example.com',
        username: 'muhammedthajchorampatta', // 23 chars
      };

      userModel.findOne.mockResolvedValue(mockUser);
      userModel.exists.mockImplementation(({ username }: any) => {
        if (username === 'muhammedthajchorampa') {
          return Promise.resolve({ _id: 'other_user_id' });
        }
        return Promise.resolve(null);
      });

      const result = await service.loginSendOtp(
        'muhammedthajchorampatta@example.com',
      );

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockUser.username.length).toBeLessThanOrEqual(20);
      expect(mockUser.username).not.toBe('muhammedthajchorampa');
      expect(usernameService.validate(mockUser.username).valid).toBe(true);
      expect(userModel.updateOne).toHaveBeenCalled();
    });

    it('should NOT alter already-valid existing usernames', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Riswan',
        email: 'riswan@example.com',
        username: 'riswan', // Valid compliant username
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.loginSendOtp('riswan@example.com');

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockUser.username).toBe('riswan');
      expect(userModel.updateOne).toHaveBeenCalled();
    });

    it('should normalize email with leading/trailing spaces and mixed casing', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439013',
        name: 'Jane Doe',
        email: 'jane@example.com',
        username: 'janedoe',
      };

      userModel.findOne.mockResolvedValue(mockUser);

      await service.loginSendOtp('  Jane@Example.COM  ');

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'jane@example.com',
      });
    });
  });

  describe('loginVerifyOtp', () => {
    const validOtp = '123456';
    let hashedOtp: string;

    beforeEach(async () => {
      hashedOtp = await bcrypt.hash(validOtp, 10);
    });

    it('should verify OTP and normalize mixed-case or whitespace email', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439014',
        name: 'Alex Student',
        email: 'alex@example.com',
        username: 'alexstudent',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() + 60000),
        devices: [],
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.loginVerifyOtp(
        {
          email: '  ALEX@Example.com  ',
          otp: validOtp,
          deviceId: 'dev_iphone_1',
          deviceType: 'mobile',
          browser: 'Mobile Safari',
          os: 'iOS',
        },
        '192.168.1.100',
      );

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'alex@example.com',
      });
      expect(result.message).toBe('Login successful');
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            otp: null,
            otpExpiry: null,
          }),
        }),
      );
    });

    it('should reject invalid OTP', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439014',
        email: 'alex@example.com',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() + 60000),
        devices: [],
      };

      userModel.findOne.mockResolvedValue(mockUser);

      await expect(
        service.loginVerifyOtp(
          {
            email: 'alex@example.com',
            otp: '999999',
            deviceId: 'dev_1',
            deviceType: 'desktop',
            browser: 'Chrome',
            os: 'macOS',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired OTP', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439014',
        email: 'alex@example.com',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() - 10000), // Expired 10 seconds ago
        devices: [],
      };

      userModel.findOne.mockResolvedValue(mockUser);

      await expect(
        service.loginVerifyOtp(
          {
            email: 'alex@example.com',
            otp: validOtp,
            deviceId: 'dev_1',
            deviceType: 'desktop',
            browser: 'Chrome',
            os: 'macOS',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should purge expired sessions and allow login when 2 expired devices exist', async () => {
      const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439015',
        email: 'alex@example.com',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() + 60000),
        devices: [
          {
            deviceId: 'old_device_1',
            deviceType: 'mobile',
            refreshTokenExpiry: expiredDate,
            lastSeen: expiredDate,
          },
          {
            deviceId: 'old_device_2',
            deviceType: 'desktop',
            refreshTokenExpiry: expiredDate,
            lastSeen: expiredDate,
          },
        ],
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.loginVerifyOtp(
        {
          email: 'alex@example.com',
          otp: validOtp,
          deviceId: 'new_device_3',
          deviceType: 'mobile',
          browser: 'Chrome',
          os: 'Android',
        },
        '127.0.0.1',
      );

      expect(result.message).toBe('Login successful');
      // The two expired devices must have been purged, leaving only the newly added device!
      expect(mockUser.devices).toHaveLength(1);
      expect(mockUser.devices[0].deviceId).toBe('new_device_3');
    });

    it('should allow login with 1 active device and 1 expired device', async () => {
      const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const activeDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // active for 3 more days
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439016',
        email: 'alex@example.com',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() + 60000),
        devices: [
          {
            deviceId: 'active_desktop',
            deviceType: 'desktop',
            refreshTokenExpiry: activeDate,
            lastSeen: new Date(),
          },
          {
            deviceId: 'expired_mobile',
            deviceType: 'mobile',
            refreshTokenExpiry: expiredDate,
            lastSeen: expiredDate,
          },
        ],
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.loginVerifyOtp(
        {
          email: 'alex@example.com',
          otp: validOtp,
          deviceId: 'new_mobile',
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
        },
        '127.0.0.1',
      );

      expect(result.message).toBe('Login successful');
      // 1 active retained + 1 new added = 2 active devices
      expect(mockUser.devices).toHaveLength(2);
      expect(mockUser.devices.map((d: any) => d.deviceId)).toEqual([
        'active_desktop',
        'new_mobile',
      ]);
    });

    it('should reject login with UnauthorizedException if 2 active unexpired devices exist and user tries a 3rd device', async () => {
      const activeDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439017',
        email: 'alex@example.com',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() + 60000),
        devices: [
          {
            deviceId: 'active_mobile',
            deviceType: 'mobile',
            refreshTokenExpiry: activeDate,
            lastSeen: new Date(),
          },
          {
            deviceId: 'active_desktop',
            deviceType: 'desktop',
            refreshTokenExpiry: activeDate,
            lastSeen: new Date(),
          },
        ],
      };

      userModel.findOne.mockResolvedValue(mockUser);

      await expect(
        service.loginVerifyOtp(
          {
            email: 'alex@example.com',
            otp: validOtp,
            deviceId: 'third_device_tablet',
            deviceType: 'tablet',
            browser: 'Chrome',
            os: 'Android',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow(new UnauthorizedException('Device limit exceeded'));
    });

    it('should succeed for legacy user accounts without throwing schema validation errors', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439018',
        email: 'legacy@example.com',
        otp: hashedOtp,
        otpExpiry: new Date(Date.now() + 60000),
        devices: [],
        // Legacy document missing required schema properties on sub-arrays:
        experience: [{ role: 'Developer' }], // Missing company, startDate, etc.
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.loginVerifyOtp(
        {
          email: 'legacy@example.com',
          otp: validOtp,
          deviceId: 'dev_legacy_1',
          deviceType: 'desktop',
          browser: 'Firefox',
          os: 'Linux',
        },
        '127.0.0.1',
      );

      expect(result.message).toBe('Login successful');
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            otp: null,
            otpExpiry: null,
          }),
        }),
      );
    });
  });
});
