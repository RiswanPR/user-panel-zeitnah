import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
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

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
    };

    auditLogsService = {
      record: jest.fn().mockResolvedValue({}),
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
          },
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
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
        save: jest.fn().mockImplementation(function () {
          // Verify that when save is called, username has been repaired to <= 20 chars!
          if (this.username.length > 20) {
            const err = new Error(
              `User validation failed: username: Path \`username\` (\`${this.username}\`, length ${this.username.length}) is longer than the maximum allowed length (20).`,
            );
            err.name = 'ValidationError';
            throw err;
          }
          return Promise.resolve(this);
        }),
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
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should resolve collision if truncated base username already exists', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Muhammed Thaj Chorampatta',
        email: 'muhammedthajchorampatta@example.com',
        username: 'muhammedthajchorampatta', // 23 chars
        save: jest.fn().mockImplementation(function () {
          if (this.username.length > 20) {
            const err = new Error('ValidationError: length exceeds 20');
            err.name = 'ValidationError';
            throw err;
          }
          return Promise.resolve(this);
        }),
      };

      userModel.findOne.mockResolvedValue(mockUser);
      // Simulate that 'muhammedthajchorampa' is taken, but next candidate is free
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
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should NOT alter already-valid existing usernames', async () => {
      const mockUser: any = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Riswan',
        email: 'riswan@example.com',
        username: 'riswan', // Valid compliant username
        save: jest.fn().mockResolvedValue({}),
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.loginSendOtp('riswan@example.com');

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockUser.username).toBe('riswan'); // Completely unchanged
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
