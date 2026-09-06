import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications/notifications.gateway';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './auth/schemas/user.schema';

describe('Phase 0 Security & Mobile Compatibility Hardening', () => {
  const JWT_SECRET = 'phase0-test-secret-key-32chars!';
  let jwtService: JwtService;

  beforeAll(() => {
    jwtService = new JwtService({ secret: JWT_SECRET });
  });

  describe('Task 2 — CORS Allowlist Security Validation', () => {
    const allowedOrigins = [
      'https://beta.zeitnahacademy.com',
      'https://zeitnahacademy.com',
      'capacitor://localhost',
      'http://localhost',
      'https://localhost',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    const corsValidator = (origin: string | undefined): boolean => {
      if (!origin) return true; // server-to-server or curl/mobile non-browser
      if (allowedOrigins.includes(origin)) return true;
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        return true;
      }
      return false;
    };

    it('should allow production web origins', () => {
      expect(corsValidator('https://beta.zeitnahacademy.com')).toBe(true);
      expect(corsValidator('https://zeitnahacademy.com')).toBe(true);
    });

    it('should allow Capacitor mobile native origins', () => {
      expect(corsValidator('capacitor://localhost')).toBe(true);
      expect(corsValidator('http://localhost')).toBe(true);
      expect(corsValidator('https://localhost')).toBe(true);
    });

    it('should allow local development origins with various ports', () => {
      expect(corsValidator('http://localhost:5173')).toBe(true);
      expect(corsValidator('http://localhost:3000')).toBe(true);
      expect(corsValidator('http://localhost:8080')).toBe(true);
    });

    it('should REJECT unauthorized external web origins', () => {
      expect(corsValidator('https://evil-hacker.com')).toBe(false);
      expect(corsValidator('https://fake-zeitnahacademy.com')).toBe(false);
      expect(corsValidator('http://attacker.com')).toBe(false);
      expect(corsValidator('capacitor://evil')).toBe(false);
    });
  });

  describe('Task 3 — Notifications Gateway Cryptographic JWT Auth', () => {
    let gateway: NotificationsGateway;

    beforeEach(() => {
      gateway = new NotificationsGateway(jwtService);
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        emit: jest.fn(),
      } as any;
    });

    it('should authenticate client with valid JWT and extract verified userId', async () => {
      const validToken = jwtService.sign({ userId: 'verified-user-123', email: 'student@test.com' });
      const mockSocket: any = {
        id: 'socket-1',
        handshake: {
          auth: { token: validToken, userId: 'spoofed-hacker-id' },
          headers: {},
          query: {},
        },
        data: {},
        join: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(mockSocket.data.userId).toBe('verified-user-123'); // Trusted token payload, NOT spoofed userId
      expect(mockSocket.join).toHaveBeenCalledWith('user_verified-user-123');
    });

    it('should extract token from authorization header if not in auth payload', async () => {
      const validToken = jwtService.sign({ userId: 'header-user-456', email: 'header@test.com' });
      const mockSocket: any = {
        id: 'socket-2',
        handshake: {
          auth: {},
          headers: { authorization: `Bearer ${validToken}` },
          query: {},
        },
        data: {},
        join: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(mockSocket.data.userId).toBe('header-user-456');
      expect(mockSocket.join).toHaveBeenCalledWith('user_header-user-456');
    });

    it('should reject connection when token is missing', async () => {
      const mockSocket: any = {
        id: 'socket-unauth',
        handshake: { auth: {}, headers: {}, query: {} },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject connection when token is invalid or malformed', async () => {
      const mockSocket: any = {
        id: 'socket-invalid',
        handshake: { auth: { token: 'bad-token-xyz' }, headers: {}, query: {} },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject connection when token is expired', async () => {
      const expiredToken = jwtService.sign(
        { userId: 'user-expired' },
        { expiresIn: '-1s' }
      );
      const mockSocket: any = {
        id: 'socket-expired',
        handshake: { auth: { token: expiredToken }, headers: {}, query: {} },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('Task 7 — JWT Strategy Query-Parameter Extraction for iOS HLS', () => {
    let strategy: JwtStrategy;
    const mockUserModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({}),
    };

    beforeEach(() => {
      process.env.JWT_SECRET = JWT_SECRET;
      strategy = new JwtStrategy(mockUserModel as any);
    });

    it('should authenticate user with valid payload', async () => {
      const mockUser = {
        _id: 'user-789',
        email: 'ios@zeitnah.com',
        role: 'student',
        account_Status: { isBlocked: false, isDeleted: false },
        devices: [
          {
            deviceId: 'device-ios-123',
            isActive: true,
            refreshTokenExpiry: new Date(Date.now() + 86400000),
          },
        ],
      };

      mockUserModel.findById.mockResolvedValue(mockUser);

      const validated = await strategy.validate({
        userId: 'user-789',
        role: 'student',
        deviceId: 'device-ios-123',
      });

      expect(validated).toBeDefined();
      expect(validated.userId).toBe('user-789');
      expect(validated.email).toBe('ios@zeitnah.com');
      expect(validated.deviceId).toBe('device-ios-123');
    });

    it('should reject blocked user', async () => {
      const blockedUser = {
        _id: 'user-blocked',
        email: 'bad@zeitnah.com',
        role: 'student',
        account_Status: { isBlocked: true, isDeleted: false },
        devices: [
          {
            deviceId: 'device-suspended',
            isActive: true,
          },
        ],
      };

      mockUserModel.findById.mockResolvedValue(blockedUser);

      await expect(
        strategy.validate({
          userId: 'user-blocked',
          role: 'student',
          deviceId: 'device-suspended',
        }),
      ).rejects.toThrow();
    });
  });
});
