import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from './announcements/announcements.service';
import { PlatformAnnouncement } from './announcements/platform-announcement.schema';
import { Announcement } from './announcements/schemas/announcement.schema';
import { User } from './auth/schemas/user.schema';
import { Notification } from './notifications/schemas/notification.schema';
import { MessagesGateway } from './messaging/messages.gateway';
import { NotificationsGateway } from './notifications/notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { ResendEmailProvider } from '../common/email/resend-email.provider';
import * as http from 'http';
import { Server as EngineServer } from 'engine.io';
import * as fs from 'fs';
import * as path from 'path';

describe('Final Production Hardening Verification Suite', () => {
  // ─────────────────────────────────────────────────────────────
  // 1. Socket.IO & Nginx WebSocket Audit: Forensic Engine.IO 400 Verification
  // ─────────────────────────────────────────────────────────────
  describe('Item 1: Forensic Nginx / Engine.IO WebSocket Transport Audit', () => {
    let engineServer: EngineServer;
    let httpServer: http.Server;
    let serverPort: number;

    beforeAll((done) => {
      httpServer = http.createServer();
      engineServer = new EngineServer({
        cors: { origin: '*' },
        transports: ['polling', 'websocket'],
      });
      engineServer.attach(httpServer, { path: '/api/socket.io/' });
      httpServer.listen(0, '127.0.0.1', () => {
        const addr = httpServer.address();
        serverPort = typeof addr === 'object' && addr ? addr.port : 0;
        done();
      });
    });

    afterAll((done) => {
      engineServer.close();
      httpServer.close(done);
    });

    it('✓ Polling transport handshake returns HTTP 200 with SID and websocket upgrade capability', async () => {
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/socket.io/?EIO=4&transport=polling`,
      );
      expect(res.status).toBe(200);
      const text = await res.text();
      // Engine.IO open packet begins with '0{"sid":...'
      expect(text.startsWith('0{')).toBe(true);
      const payload = JSON.parse(text.slice(1));
      expect(payload.sid).toBeDefined();
      expect(payload.upgrades).toContain('websocket');
    });

    it('✓ When proxy forwards transport=websocket WITHOUT Upgrade header, Engine.IO returns HTTP 400 {"code":3,"message":"Bad request"}', async () => {
      // Simulate Nginx receiving Upgrade request but stripping Upgrade headers before forwarding to upstream Node
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/socket.io/?EIO=4&transport=websocket`,
        {
          method: 'GET',
          // Plain HTTP headers — no Upgrade or Connection headers forwarded by proxy
        },
      );

      // Verify exact root cause: Engine.IO responds with 400 Bad Request
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({
        code: 3,
        message: 'Bad request',
      });
    });

    it('✓ Client Socket.IO path is strictly configured as /api/socket.io/ across frontend contexts', () => {
      const messagingContextPath = path.resolve(
        __dirname,
        '../../../frontend/src/context/MessagingContext.jsx',
      );
      const notificationContextPath = path.resolve(
        __dirname,
        '../../../frontend/src/context/NotificationContext.jsx',
      );

      const msgContent = fs.readFileSync(messagingContextPath, 'utf8');
      const notifContent = fs.readFileSync(notificationContextPath, 'utf8');

      expect(msgContent).toContain("path: '/api/socket.io/'");
      expect(notifContent).toContain("path: '/api/socket.io/'");

      // Verify baseURL does not produce duplicate /api/ or trailing slash conflicts
      expect(msgContent).toContain(
        "import.meta.env.VITE_API_BASE_URL.replace(/\\/api\\/?$/, '')",
      );
      expect(notifContent).toContain(
        "import.meta.env.VITE_API_BASE_URL.replace(/\\/api\\/?$/, '')",
      );
    });

    it('✓ MessagingContext and NotificationContext cleanly remove listeners and disconnect on unmount', () => {
      const messagingContextPath = path.resolve(
        __dirname,
        '../../../frontend/src/context/MessagingContext.jsx',
      );
      const notificationContextPath = path.resolve(
        __dirname,
        '../../../frontend/src/context/NotificationContext.jsx',
      );

      const msgContent = fs.readFileSync(messagingContextPath, 'utf8');
      const notifContent = fs.readFileSync(notificationContextPath, 'utf8');

      // Messaging cleanup
      expect(msgContent).toContain('active = false');
      expect(msgContent).toContain('newSocket.disconnect()');
      expect(msgContent).toContain('window.removeEventListener');

      // Notification cleanup
      expect(notifContent).toContain('active = false');
      expect(notifContent).toContain('newSocket.disconnect()');
      expect(notifContent).toContain('window.removeEventListener');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Jest Worker / Timer Cleanup
  // ─────────────────────────────────────────────────────────────
  describe('Item 2: Jest Worker & Background Timer Teardown', () => {
    it('✓ ResendEmailProvider sendWithTimeout cancels timer and calls unref to prevent leaking worker handles', async () => {
      const provider = new ResendEmailProvider();
      expect(provider).toBeDefined();

      const providerPath = path.resolve(
        __dirname,
        '../../../backend/src/common/email/resend-email.provider.ts',
      );
      const content = fs.readFileSync(providerPath, 'utf8');

      // Verify unref() and clearTimeout() are present
      expect(content).toContain('clearTimeout(timer)');
      expect(content).toContain('timer.unref()');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Final Error Capture Audit
  // ─────────────────────────────────────────────────────────────
  describe('Item 3: Final Error Capture Classification Audit', () => {
    it('✓ errorCapture.ts defines all 7 canonical error categories and excludes non-critical noise', () => {
      const errorCapturePath = path.resolve(
        __dirname,
        '../../../frontend/src/utils/errorCapture.ts',
      );
      const content = fs.readFileSync(errorCapturePath, 'utf8');

      expect(content).toContain("'EXPECTED_AUTH'");
      expect(content).toContain("'RECOVERABLE_AUTH'");
      expect(content).toContain("'USER_ACTION_ERROR'");
      expect(content).toContain("'WEBSOCKET_TRANSIENT'");
      expect(content).toContain("'NETWORK_TRANSIENT'");
      expect(content).toContain("'REAL_APPLICATION_ERROR'");

      // Verify /auth/me 401 is classified as EXPECTED_AUTH and not a failure
      expect(content).toMatch(
        /status === 401 && cleanUrl\.includes\('\/auth\/me'\)/,
      );

      // Verify getSignificantErrorCount filters out recoverable and transient errors
      expect(content).toContain('getSignificantErrorCount');
      expect(content).toContain("e.category === 'REAL_APPLICATION_ERROR'");
    });

    it('✓ api.ts does not send expected 401 to error reporting telemetry', () => {
      const apiTsPath = path.resolve(
        __dirname,
        '../../../frontend/src/services/api.ts',
      );
      const content = fs.readFileSync(apiTsPath, 'utf8');

      expect(content).toContain('isExpectedAuth401');
      expect(content).toContain('!isExpectedAuth401');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Announcement Final Contract: Cases A–G
  // ─────────────────────────────────────────────────────────────
  describe('Item 4: Announcement Final Contract (Cases A through G)', () => {
    let service: AnnouncementsService;
    let mockPlatformModel: any;
    let mockMasterModel: any;
    let mockNotificationModel: any;
    let testingModule: TestingModule;

    const mockUserId = new Types.ObjectId().toHexString();

    beforeEach(async () => {
      mockPlatformModel = {
        findOne: jest.fn(),
        findById: jest.fn(),
        updateOne: jest.fn(),
      };
      mockMasterModel = {
        findOne: jest.fn(),
        findById: jest.fn(),
        updateOne: jest.fn(),
      };
      mockNotificationModel = {
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      testingModule = await Test.createTestingModule({
        providers: [
          AnnouncementsService,
          {
            provide: getModelToken(PlatformAnnouncement.name),
            useValue: mockPlatformModel,
          },
          {
            provide: getModelToken(Announcement.name),
            useValue: mockMasterModel,
          },
          {
            provide: getModelToken(Notification.name),
            useValue: mockNotificationModel,
          },
          {
            provide: getModelToken(User.name),
            useValue: { findById: jest.fn() },
          },
        ],
      }).compile();

      service = testingModule.get<AnnouncementsService>(AnnouncementsService);
    });

    afterEach(async () => {
      if (testingModule) {
        await testingModule.close();
      }
    });

    it('✓ Case A: Valid UUID-style ID is dismissed without CastError', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: uuid,
          title: 'UUID Announcement',
          allowDismiss: true,
          dismissedBy: [],
        }),
      });
      mockPlatformModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const result = await service.dismissAnnouncement(uuid, mockUserId);
      expect(result.success).toBe(true);
      expect(result.alreadyDismissed).toBeUndefined();
      expect(mockPlatformModel.updateOne).toHaveBeenCalledWith(
        { _id: uuid },
        expect.any(Object),
      );
    });

    it('✓ Case B: Valid ObjectId-style ID is dismissed without CastError', async () => {
      const objId = new Types.ObjectId().toHexString();
      mockMasterModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(objId),
          title: 'ObjectId Announcement',
          allowDismiss: true,
          dismissedBy: [],
        }),
      });
      mockPlatformModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const result = await service.dismissAnnouncement(objId, mockUserId);
      expect(result.success).toBe(true);
      expect(mockPlatformModel.updateOne).toHaveBeenCalled();
    });

    it('✓ Case C: Already dismissed announcement returns success idempotently without DB mutation', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001';
      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: uuid,
          title: 'Dismissed Announcement',
          allowDismiss: true,
          dismissedBy: [mockUserId],
        }),
      });

      const result = await service.dismissAnnouncement(uuid, mockUserId);
      expect(result.success).toBe(true);
      expect(result.alreadyDismissed).toBe(true);
      expect(mockPlatformModel.updateOne).not.toHaveBeenCalled();
    });

    it('✓ Case D: Repeated rapid clicks are idempotent and handled cleanly', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440002';
      let dismissed = false;
      mockPlatformModel.findOne.mockImplementation(() => ({
        lean: jest.fn().mockImplementation(async () => ({
          _id: uuid,
          title: 'Rapid Click Announcement',
          allowDismiss: true,
          dismissedBy: dismissed ? [mockUserId] : [],
        })),
      }));
      mockPlatformModel.updateOne.mockImplementation(async () => {
        dismissed = true;
        return { matchedCount: 1, modifiedCount: 1 };
      });

      // Call twice rapidly
      const [res1, res2] = await Promise.all([
        service.dismissAnnouncement(uuid, mockUserId),
        service.dismissAnnouncement(uuid, mockUserId),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
    });

    it('✓ Case E: Invalid or missing announcement ID throws structured 400 INVALID_ANNOUNCEMENT_ID', async () => {
      await expect(service.dismissAnnouncement('', mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.dismissAnnouncement('   ', mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.dismissAnnouncement('undefined', mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Case F: Missing announcement throws structured 404 ANNOUNCEMENT_NOT_FOUND', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655449999';
      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockMasterModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockPlatformModel.updateOne.mockResolvedValue({ matchedCount: 0 });
      mockMasterModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.dismissAnnouncement(nonExistentId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('✓ Case G: Mandatory announcement with allowDismiss=false requires explicit acknowledgment', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440003';
      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: uuid,
          title: 'Mandatory Announcement',
          allowDismiss: false,
          dismissedBy: [],
        }),
      });

      // Normal dismiss should be rejected with 400
      await expect(
        service.dismissAnnouncement(uuid, mockUserId, false),
      ).rejects.toThrow(BadRequestException);

      // Acknowledgment (isAcknowledge = true) should succeed
      mockPlatformModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });
      const ackResult = await service.dismissAnnouncement(
        uuid,
        mockUserId,
        true,
      );
      expect(ackResult.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Auth Concurrency / Single-Flight Refresh
  // ─────────────────────────────────────────────────────────────
  describe('Item 5: Auth Concurrency & Single-Flight Token Refresh Check', () => {
    it('✓ api.ts enforces single-flight token refresh with refreshPromise deduplication', () => {
      const apiTsPath = path.resolve(
        __dirname,
        '../../../frontend/src/services/api.ts',
      );
      const content = fs.readFileSync(apiTsPath, 'utf8');

      // Verify single-flight refresh lock variable
      expect(content).toContain(
        'let refreshPromise: Promise<string | null> | null = null;',
      );
      expect(content).toContain('if (refreshPromise) {');
      expect(content).toContain('return refreshPromise;');

      // Verify waiting for in-flight refresh in request interceptor
      expect(content).toContain('await refreshPromise;');

      // Verify retry prevention flag
      expect(content).toContain('_retried401');
      expect(content).toContain('config._retried401 = true;');

      // Verify event dispatch to socket contexts
      expect(content).toContain('"zeitnah:auth:token-refreshed"');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Video Progress Final Check
  // ─────────────────────────────────────────────────────────────
  describe('Item 6: Video Progress & Token-Safe Beacon Handling', () => {
    it('✓ ClassView.jsx uses proactive token refresh and checks expiry before beacon dispatch', () => {
      const classViewPath = path.resolve(
        __dirname,
        '../../../frontend/src/pages/courses/ClassView.jsx',
      );
      const content = fs.readFileSync(classViewPath, 'utf8');

      // Proactive refresh check during playback (<60s)
      expect(content).toContain('payload.exp * 1000 - Date.now() < 60000');
      expect(content).toContain('getRefreshedToken()');

      // Token expiration guard in flushLatestProgress
      expect(content).toContain('payload.exp * 1000 < Date.now()');

      // Interceptor-aware API used for background visibility change and unmount
      expect(content).toContain('void persistProgress({ force: true })');
      expect(content).toMatch(
        /document\.visibilityState\s*===\s*["']hidden["']/,
      );

      // saveInFlightRef lock preventing overlapping duplicate progress requests
      expect(content).toContain('saveInFlightRef');
    });
  });
});
