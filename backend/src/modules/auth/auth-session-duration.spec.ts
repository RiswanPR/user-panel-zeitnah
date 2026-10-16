import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './schemas/user.schema';
import { LoginHistoryService } from '../login-history/login-history.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UsernameService } from '../profile/services/username.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resend } from '../../config/resend.config';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000; // 7,776,000,000 ms
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000; // 900,000 ms

describe('Auth Session Duration & 90-Day Policy Tests', () => {
  let authService: AuthService;
  let authController: AuthController;
  let userModel: any;
  let jwtService: any;
  let auditLogsService: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };

    auditLogsService = {
      record: jest.fn().mockResolvedValue({}),
    };

    jwtService = {
      sign: jest.fn().mockImplementation((payload, opts) => {
        return `mock-jwt-token:${opts?.expiresIn || 'default'}`;
      }),
      verify: jest.fn().mockImplementation((token) => {
        if (token === 'invalid-token') {
          throw new Error('invalid signature');
        }
        return {
          userId: '507f1f77bcf86cd799439011',
          deviceId: 'dev_persistent_1',
          primaryRole: 'STUDENT',
          role: 'student',
        };
      }),
    };

    jest
      .spyOn(resend.emails, 'send')
      .mockResolvedValue({ data: { id: 'email_123' }, error: null } as any);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
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

    authService = module.get<AuthService>(AuthService);
    authController = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Configured Session & Token Expiry Policy', () => {
    it('✓ configured default session duration is exactly 90 days in milliseconds (7,776,000,000 ms)', () => {
      expect(authService.getRefreshTokenExpiryMs()).toBe(NINETY_DAYS_MS);
      expect(authService.getRefreshTokenExpiryMs()).toBe(90 * 24 * 60 * 60 * 1000);
    });

    it('✓ configured default refresh token expiration is 90d string', () => {
      expect(authService.getRefreshTokenExpiresIn()).toBe('90d');
    });

    it('✓ generates refresh token with 90d JWT expiration and 90-day future date', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Persistent User',
        email: 'user@zeitnah.com',
        role: 'student',
        primaryRole: 'STUDENT',
      };

      // Call private generateAuthTokens via any cast
      const tokens = await (authService as any).generateAuthTokens(mockUser, 'dev_test_1');

      // Refresh token JWT sign call received expiresIn: '90d'
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '507f1f77bcf86cd799439011',
          deviceId: 'dev_test_1',
        }),
        expect.objectContaining({
          expiresIn: '90d',
        }),
      );

      // Access token JWT sign call received short-lived '15m'
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '507f1f77bcf86cd799439011',
          deviceId: 'dev_test_1',
        }),
        expect.objectContaining({
          expiresIn: '15m',
        }),
      );

      // Refresh token expiry date is ~90 days in future
      const now = Date.now();
      const expiryTime = new Date(tokens.refreshTokenExpiry).getTime();
      const diffMs = expiryTime - now;

      // Must be within 5 seconds of 90 days
      expect(diffMs).toBeGreaterThan(NINETY_DAYS_MS - 5000);
      expect(diffMs).toBeLessThanOrEqual(NINETY_DAYS_MS + 5000);
    });
  });

  describe('2. Session Validity within Permitted Lifetime', () => {
    it('✓ session remains valid at 89 days (within the 90-day window)', () => {
      const deviceWithinLifetime: any = {
        deviceId: 'dev_valid_89d',
        lastSeen: new Date(),
        // 89 days from now:
        refreshTokenExpiry: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000),
      };

      const isExpired = (authService as any).isSessionExpired(deviceWithinLifetime);
      expect(isExpired).toBe(false);
    });

    it('✓ session without explicit refreshTokenExpiry remains valid if lastSeen is within 90 days', () => {
      const deviceFallbackValid: any = {
        deviceId: 'dev_fallback_valid',
        refreshTokenExpiry: null,
        // Active 10 days ago (well within 90 days):
        lastSeen: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };

      const isExpired = (authService as any).isSessionExpired(deviceFallbackValid);
      expect(isExpired).toBe(false);
    });
  });

  describe('3. Expired and Revoked Tokens are Rejected', () => {
    it('✓ session expired past 90 days is rejected', () => {
      const deviceExpired: any = {
        deviceId: 'dev_expired_91d',
        lastSeen: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
        refreshTokenExpiry: new Date(Date.now() - 1000), // expired 1 second ago
      };

      const isExpired = (authService as any).isSessionExpired(deviceExpired);
      expect(isExpired).toBe(true);
    });

    it('✓ refresh token rejects expired session and removes device from DB', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      const mockRawToken = 'mock-refresh-token-expired';
      const hashedToken = await bcrypt.hash(mockRawToken, 10);

      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [
          {
            deviceId: 'dev_persistent_1',
            refreshToken: hashedToken,
            refreshTokenExpiry: expiredDate,
            lastSeen: expiredDate,
          },
        ],
        account_Status: { isBlocked: false, isDeleted: false },
      };

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(authService.refreshToken(mockRawToken)).rejects.toThrow(
        new UnauthorizedException('Refresh token expired'),
      );

      // Verify that expired device is purged
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        { $pull: { devices: { deviceId: 'dev_persistent_1' } } },
      );
    });

    it('✓ refresh token rejects unknown or revoked device session', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [
          {
            deviceId: 'different_device_id',
            refreshToken: 'some_hash',
          },
        ],
        account_Status: { isBlocked: false, isDeleted: false },
      };

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(authService.refreshToken('valid-looking-token')).rejects.toThrow(
        new UnauthorizedException('Device session expired'),
      );
    });

    it('✓ refresh token rejects invalid JWT token signature', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('✓ refresh token rejects mismatched token hash', async () => {
      const differentHash = await bcrypt.hash('different-secret-token', 10);

      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [
          {
            deviceId: 'dev_persistent_1',
            refreshToken: differentHash,
            refreshTokenExpiry: new Date(Date.now() + NINETY_DAYS_MS),
            lastSeen: new Date(),
          },
        ],
        account_Status: { isBlocked: false, isDeleted: false },
      };

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(authService.refreshToken('current-token-does-not-match')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('4. Refresh-Token Rotation & Reuse Detection', () => {
    it('✓ rotates refresh token, extends expiry to 90 days, and saves previous token', async () => {
      const rawCurrentToken = 'valid-current-refresh-token';
      const hashedCurrentToken = await bcrypt.hash(rawCurrentToken, 10);

      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Active User',
        email: 'user@zeitnah.com',
        username: 'activeuser',
        devices: [
          {
            deviceId: 'dev_persistent_1',
            refreshToken: hashedCurrentToken,
            refreshTokenExpiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days left
            lastSeen: new Date(),
          },
        ],
        account_Status: { isBlocked: false, isDeleted: false },
      };

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.refreshToken(rawCurrentToken);

      expect(result.message).toBe('Token refreshed successfully');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.sessionExpiresAt).toBeDefined();

      // Ensure updated refreshTokenExpiry is ~90 days in future
      const diff = new Date(result.sessionExpiresAt).getTime() - Date.now();
      expect(diff).toBeGreaterThan(NINETY_DAYS_MS - 5000);

      // Verify update in DB stores previousRefreshToken and new 90-day expiry
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id, 'devices.deviceId': 'dev_persistent_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            'devices.$.previousRefreshToken': hashedCurrentToken,
            'devices.$.refreshTokenExpiry': expect.any(Date),
          }),
        }),
      );
    });

    it('✓ permits previous refresh token within 15-second grace window (concurrent requests)', async () => {
      const rawPrevToken = 'previous-refresh-token-in-grace';
      const hashedPrevToken = await bcrypt.hash(rawPrevToken, 10);
      const newHashedToken = await bcrypt.hash('new-token-already-rotated', 10);

      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Concurrent User',
        email: 'user@zeitnah.com',
        devices: [
          {
            deviceId: 'dev_persistent_1',
            refreshToken: newHashedToken,
            previousRefreshToken: hashedPrevToken,
            // Last seen 5 seconds ago (within 15s grace period):
            lastSeen: new Date(Date.now() - 5000),
            refreshTokenExpiry: new Date(Date.now() + NINETY_DAYS_MS),
          },
        ],
        account_Status: { isBlocked: false, isDeleted: false },
      };

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.refreshToken(rawPrevToken);
      expect(result.message).toBe('Token refreshed successfully');
    });

    it('✓ rejects previous refresh token beyond 15-second grace window (reuse attack prevention)', async () => {
      const rawPrevToken = 'old-stolen-token';
      const hashedPrevToken = await bcrypt.hash(rawPrevToken, 10);
      const newHashedToken = await bcrypt.hash('latest-token', 10);

      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [
          {
            deviceId: 'dev_persistent_1',
            refreshToken: newHashedToken,
            previousRefreshToken: hashedPrevToken,
            // Rotated 20 seconds ago (grace period expired!):
            lastSeen: new Date(Date.now() - 20000),
            refreshTokenExpiry: new Date(Date.now() + NINETY_DAYS_MS),
          },
        ],
        account_Status: { isBlocked: false, isDeleted: false },
      };

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(authService.refreshToken(rawPrevToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('5. Logout and Session Revocation Behavior', () => {
    it('✓ logout removes device session from user document and records audit event', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [
          { deviceId: 'dev_logout_1' },
          { deviceId: 'dev_retained_2' },
        ],
      };

      userModel.findById.mockResolvedValue(mockUser);

      const authUser: any = {
        userId: '507f1f77bcf86cd799439011',
        deviceId: 'dev_logout_1',
      };

      const result = await authService.logout(authUser);

      expect(result.message).toBe('Logout successful');
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        { $pull: { devices: { deviceId: 'dev_logout_1' } } },
      );
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
          deviceId: 'dev_logout_1',
        }),
      );
    });

    it('✓ revokeSession terminates specific session and leaves others intact', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [
          { deviceId: 'dev_current' },
          { deviceId: 'dev_to_revoke' },
        ],
      };

      userModel.findById.mockResolvedValue(mockUser);

      const authUser: any = {
        userId: '507f1f77bcf86cd799439011',
        deviceId: 'dev_current',
      };

      const result = await authService.revokeSession(authUser, 'dev_to_revoke');

      expect(result.success).toBe(true);
      expect(result.revokedCurrentSession).toBe(false);
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser._id },
        { $pull: { devices: { deviceId: 'dev_to_revoke' } } },
      );
    });
  });

  describe('6. AuthController Cookie Expiration Policy', () => {
    it('✓ sets refreshToken cookie with 90-day maxAge and token with 15-minute maxAge', async () => {
      const mockRes: any = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      };

      // Test private setAuthCookies via any cast
      (authController as any).setAuthCookies(
        mockRes,
        'mock-access-token',
        'mock-refresh-token',
      );

      // Verify token cookie: 15 minutes
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'token',
        'mock-access-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          maxAge: FIFTEEN_MINUTES_MS,
        }),
      );

      // Verify refreshToken cookie: 90 days (7,776,000,000 ms)
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          maxAge: NINETY_DAYS_MS,
        }),
      );
    });

    it('✓ logout clears both token and refreshToken cookies', async () => {
      const mockRes: any = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      };

      const mockReq: any = {
        user: {
          userId: '507f1f77bcf86cd799439011',
          deviceId: 'dev_test_1',
        },
      };

      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        devices: [{ deviceId: 'dev_test_1' }],
      };
      userModel.findById.mockResolvedValue(mockUser);

      await authController.logout(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('token', expect.any(Object));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });
  });
});
