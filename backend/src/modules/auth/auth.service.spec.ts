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
  let resendSpy: any;

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
    resendSpy = jest
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

  describe('Dedicated App Review Access', () => {
    const REVIEW_EMAIL = 'apple-review@zeitnahacademy.com';
    const REVIEW_OTP = '849201';
    let reviewOtpHashed: string;
    const ORIGINAL_ENV = process.env;

    beforeAll(async () => {
      reviewOtpHashed = await bcrypt.hash(REVIEW_OTP, 10);
    });

    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        APP_REVIEW_ACCESS_ENABLED: 'true',
        APP_REVIEW_EMAIL: REVIEW_EMAIL,
        APP_REVIEW_OTP_HASH: reviewOtpHashed,
      };
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    describe('loginSendOtp for App Review', () => {
      it('should succeed for configured review account without sending email via Resend', async () => {
        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439020',
          name: 'App Store Reviewer',
          email: REVIEW_EMAIL,
          username: 'applereviewer',
          role: 'student',
          primaryRole: 'STUDENT',
          account_Status: {
            isVerified: true,
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        const result = await service.loginSendOtp(REVIEW_EMAIL);

        expect(result).toEqual({ message: 'OTP sent successfully' });
        // Email service should NOT be called for review account in loginSendOtp
        expect(resendSpy).not.toHaveBeenCalled();
        expect(auditLogsService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'APP_REVIEW_OTP_REQUESTED',
            metadata: { email: REVIEW_EMAIL },
          }),
        );
      });

      it('should reject loginSendOtp if review account is blocked', async () => {
        const blockedReviewUser: any = {
          _id: '507f1f77bcf86cd799439021',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: { isBlocked: true },
        };

        userModel.findOne.mockResolvedValue(blockedReviewUser);

        await expect(service.loginSendOtp(REVIEW_EMAIL)).rejects.toThrow(
          new UnauthorizedException('Account restricted'),
        );
      });

      it('should reject loginSendOtp if review account is marked isDeleted', async () => {
        const deletedReviewUser: any = {
          _id: '507f1f77bcf86cd799439022',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: { isDeleted: true },
        };

        userModel.findOne.mockResolvedValue(deletedReviewUser);

        await expect(service.loginSendOtp(REVIEW_EMAIL)).rejects.toThrow(
          new UnauthorizedException('Account restricted'),
        );
      });

      it('should reject loginSendOtp if review account isActive is false', async () => {
        const inactiveReviewUser: any = {
          _id: '507f1f77bcf86cd799439023',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: { isActive: false },
        };

        userModel.findOne.mockResolvedValue(inactiveReviewUser);

        await expect(service.loginSendOtp(REVIEW_EMAIL)).rejects.toThrow(
          new UnauthorizedException('Account inactive'),
        );
      });

      it('should strictly reject loginSendOtp if review account has admin role', async () => {
        const adminReviewUser: any = {
          _id: '507f1f77bcf86cd799439024',
          email: REVIEW_EMAIL,
          role: 'admin',
          primaryRole: 'ADMIN',
          account_Status: {
            isBlocked: false,
            isDeleted: false,
            isActive: true,
          },
        };

        userModel.findOne.mockResolvedValue(adminReviewUser);

        await expect(service.loginSendOtp(REVIEW_EMAIL)).rejects.toThrow(
          new UnauthorizedException(
            'Review access not permitted for privileged accounts',
          ),
        );
      });
    });

    describe('loginVerifyOtp for App Review', () => {
      it('should successfully authenticate review account using configured review OTP and create valid session', async () => {
        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439025',
          name: 'App Reviewer',
          email: REVIEW_EMAIL,
          username: 'applestudent',
          role: 'student',
          primaryRole: 'STUDENT',
          account_Status: {
            isVerified: true,
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          devices: [],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        const result = await service.loginVerifyOtp(
          {
            email: REVIEW_EMAIL,
            otp: REVIEW_OTP,
            deviceId: 'apple_test_device_1',
            deviceType: 'mobile',
            browser: 'Mobile Safari',
            os: 'iOS',
          },
          '17.0.0.1',
        );

        expect(result.message).toBe('Login successful');
        expect(result.accessToken).toBe('mock-jwt-token');
        expect(result.refreshToken).toBe('mock-jwt-token');
        expect(result.user.email).toBe(REVIEW_EMAIL);
        expect(result.user.primaryRole).toBe('STUDENT');
        expect(auditLogsService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'APP_REVIEW_LOGIN_SUCCESS',
            metadata: expect.objectContaining({ email: REVIEW_EMAIL }),
          }),
        );
      });

      it('should reject login if review OTP is incorrect', async () => {
        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439026',
          email: REVIEW_EMAIL,
          role: 'student',
          primaryRole: 'STUDENT',
          account_Status: {
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          devices: [],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: '000000', // Invalid review OTP
              deviceId: 'apple_test_device_1',
              deviceType: 'mobile',
              browser: 'Mobile Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Invalid OTP'));
      });

      it('should NOT fall back to checking user.otp when review credential fails', async () => {
        // Even if user.otp has a valid code from another source, review branch must reject mismatch
        const fallbackOtp = '654321';
        const fallbackOtpHashed = await bcrypt.hash(fallbackOtp, 10);

        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439027',
          email: REVIEW_EMAIL,
          otp: fallbackOtpHashed,
          otpExpiry: new Date(Date.now() + 60000),
          role: 'student',
          primaryRole: 'STUDENT',
          account_Status: {
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          devices: [],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        // Attempting to pass fallback OTP when review access is enabled must fail!
        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: fallbackOtp,
              deviceId: 'apple_test_device_1',
              deviceType: 'mobile',
              browser: 'Mobile Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Invalid OTP'));
      });

      it('should reject review OTP when APP_REVIEW_ACCESS_ENABLED is "false"', async () => {
        process.env.APP_REVIEW_ACCESS_ENABLED = 'false';

        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439028',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: {
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          otp: null,
          otpExpiry: null,
          devices: [],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        // Falls back to normal OTP flow where user.otp is null -> OTP expired or not found
        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_test_device_1',
              deviceType: 'mobile',
              browser: 'Mobile Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject review OTP when APP_REVIEW_ACCESS_ENABLED is unset', async () => {
        delete process.env.APP_REVIEW_ACCESS_ENABLED;

        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439029',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: {
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          otp: null,
          devices: [],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_test_device_1',
              deviceType: 'mobile',
              browser: 'Mobile Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject review OTP when APP_REVIEW_OTP_HASH is missing', async () => {
        delete process.env.APP_REVIEW_OTP_HASH;

        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439030',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: {
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          devices: [],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        // When hash is missing, isAppReviewAccount returns false and normal OTP check runs
        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_test_device_1',
              deviceType: 'mobile',
              browser: 'Mobile Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject review OTP when entered for any other user email', async () => {
        const regularUserEmail = 'regular.student@example.com';
        const regularUser: any = {
          _id: '507f1f77bcf86cd799439031',
          email: regularUserEmail,
          role: 'student',
          primaryRole: 'STUDENT',
          otp: await bcrypt.hash('112233', 10),
          otpExpiry: new Date(Date.now() + 60000),
          account_Status: {
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          devices: [],
        };

        userModel.findOne.mockResolvedValue(regularUser);

        // Submitting review OTP for a regular user MUST fail against regular user's OTP
        await expect(
          service.loginVerifyOtp(
            {
              email: regularUserEmail,
              otp: REVIEW_OTP, // Attempting review OTP on non-review account
              deviceId: 'dev_some_device',
              deviceType: 'mobile',
              browser: 'Chrome',
              os: 'Android',
            },
            '127.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Invalid OTP'));
      });

      it('should reject review login if account does not exist in database', async () => {
        userModel.findOne.mockResolvedValue(null);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_device_x',
              deviceType: 'mobile',
              browser: 'Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('User not found'));
      });

      it('should reject review login if review account is blocked', async () => {
        const blockedReviewUser: any = {
          _id: '507f1f77bcf86cd799439032',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: { isBlocked: true },
        };

        userModel.findOne.mockResolvedValue(blockedReviewUser);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_device_x',
              deviceType: 'mobile',
              browser: 'Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Account restricted'));
      });

      it('should reject review login if review account is marked isDeleted', async () => {
        const deletedReviewUser: any = {
          _id: '507f1f77bcf86cd799439033',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: { isDeleted: true },
        };

        userModel.findOne.mockResolvedValue(deletedReviewUser);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_device_x',
              deviceType: 'mobile',
              browser: 'Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Account restricted'));
      });

      it('should reject review login if review account isActive is false', async () => {
        const inactiveReviewUser: any = {
          _id: '507f1f77bcf86cd799439034',
          email: REVIEW_EMAIL,
          role: 'student',
          account_Status: { isActive: false },
        };

        userModel.findOne.mockResolvedValue(inactiveReviewUser);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_device_x',
              deviceType: 'mobile',
              browser: 'Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Account inactive'));
      });

      it('should strictly reject review login if review account has admin role', async () => {
        const adminReviewUser: any = {
          _id: '507f1f77bcf86cd799439035',
          email: REVIEW_EMAIL,
          role: 'admin',
          primaryRole: 'ADMIN',
          account_Status: {
            isBlocked: false,
            isDeleted: false,
            isActive: true,
          },
        };

        userModel.findOne.mockResolvedValue(adminReviewUser);

        await expect(
          service.loginVerifyOtp(
            {
              email: REVIEW_EMAIL,
              otp: REVIEW_OTP,
              deviceId: 'apple_device_x',
              deviceType: 'mobile',
              browser: 'Safari',
              os: 'iOS',
            },
            '17.0.0.1',
          ),
        ).rejects.toThrow(
          new UnauthorizedException(
            'Review access not permitted for privileged accounts',
          ),
        );
      });

      it('should automatically manage device slots for review account so reviewers on multiple devices are not blocked', async () => {
        const mockReviewUser: any = {
          _id: '507f1f77bcf86cd799439036',
          name: 'App Reviewer',
          email: REVIEW_EMAIL,
          username: 'applestudent',
          role: 'student',
          primaryRole: 'STUDENT',
          account_Status: {
            isVerified: true,
            isActive: true,
            isBlocked: false,
            isDeleted: false,
          },
          devices: [
            {
              deviceId: 'prior_apple_device_1',
              deviceType: 'mobile',
              refreshTokenExpiry: new Date(Date.now() + 1000000),
            },
            {
              deviceId: 'prior_apple_device_2',
              deviceType: 'desktop',
              refreshTokenExpiry: new Date(Date.now() + 1000000),
            },
          ],
        };

        userModel.findOne.mockResolvedValue(mockReviewUser);

        const result = await service.loginVerifyOtp(
          {
            email: REVIEW_EMAIL,
            otp: REVIEW_OTP,
            deviceId: 'new_apple_ipad_3',
            deviceType: 'tablet',
            browser: 'Safari',
            os: 'iPadOS',
          },
          '17.0.0.1',
        );

        expect(result.message).toBe('Login successful');
        // Total devices must be capped at 2, oldest pruned, and new added without throwing limit exceeded
        expect(mockReviewUser.devices).toHaveLength(2);
        expect(
          mockReviewUser.devices.some(
            (d: any) => d.deviceId === 'new_apple_ipad_3',
          ),
        ).toBe(true);
      });
    });
  });
});
