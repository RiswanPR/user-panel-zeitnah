import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { AnnouncementsService } from './announcements/announcements.service';
import { PlatformAnnouncement } from './announcements/platform-announcement.schema';
import { Announcement } from './announcements/schemas/announcement.schema';
import { User } from './auth/schemas/user.schema';
import { ModerationService } from './moderation/moderation.service';
import { Block } from './moderation/schemas/block.schema';
import { Report, ReportTargetType } from './moderation/schemas/report.schema';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { MessagesGateway } from './messaging/messages.gateway';
import { NotificationsGateway } from './notifications/notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';

describe('Production Remediation P0–P3 Verification Suite', () => {
  // ─────────────────────────────────────────────────────────────
  // P0 — Universal Error Popup & App Import Restoration
  // ─────────────────────────────────────────────────────────────
  describe('P0: Universal Error Popup & AdminBusinessReviewPage Import', () => {
    it('✓ App.jsx must import AdminBusinessReviewPage using React.lazy', () => {
      const appJsxPath = path.resolve(__dirname, '../../../frontend/src/App.jsx');
      expect(fs.existsSync(appJsxPath)).toBe(true);
      const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

      // Verify the import exists and is lazy loaded
      expect(appJsxContent).toMatch(
        /const AdminBusinessReviewPage\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\(["']\.\/pages\/admin\/AdminBusinessReviewPage["']\)\s*\);/,
      );

      // Verify the route references AdminBusinessReviewPage
      expect(appJsxContent).toContain('<AdminBusinessReviewPage />');
    });

    it('✓ AdminBusinessReviewPage.jsx component file must physically exist', () => {
      const pagePath = path.resolve(
        __dirname,
        '../../../frontend/src/pages/admin/AdminBusinessReviewPage.jsx',
      );
      expect(fs.existsSync(pagePath)).toBe(true);
    });

    it('✓ GlobalErrorBoundary must continue to catch uncaught React render exceptions', () => {
      const boundaryPath = path.resolve(
        __dirname,
        '../../../frontend/src/components/GlobalErrorBoundary.jsx',
      );
      expect(fs.existsSync(boundaryPath)).toBe(true);
      const boundaryContent = fs.readFileSync(boundaryPath, 'utf8');

      // Boundary has not been disabled
      expect(boundaryContent).toContain('componentDidCatch');
      expect(boundaryContent).toContain('getDerivedStateFromError');
      expect(boundaryContent).toContain('ErrorFeedbackModal');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P1 — Announcements (UUID & ObjectId Handling + Idempotency)
  // ─────────────────────────────────────────────────────────────
  describe('P1: Announcements (UUID / ObjectId Contract & Idempotent Dismissal)', () => {
    let announcementsService: AnnouncementsService;
    let mockPlatformModel: any;
    let mockMasterModel: any;

    beforeEach(async () => {
      mockPlatformModel = {
        findOne: jest.fn(),
        findById: jest.fn(),
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn(),
        updateOne: jest.fn(),
        countDocuments: jest.fn().mockResolvedValue(0),
      };

      mockMasterModel = {
        findOne: jest.fn(),
        findById: jest.fn(),
        updateOne: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
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
            provide: getModelToken(User.name),
            useValue: { findById: jest.fn() },
          },
        ],
      }).compile();

      announcementsService = module.get<AnnouncementsService>(AnnouncementsService);
    });

    it('✓ UUID-string announcement can be dismissed safely without CastError', async () => {
      const uuidAnnouncementId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      const userId = new Types.ObjectId().toHexString();

      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: uuidAnnouncementId,
          title: 'System Maintenance',
          allowDismiss: true,
          dismissedBy: [],
        }),
      });

      mockPlatformModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });
      mockMasterModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const result = await announcementsService.dismissAnnouncement(
        uuidAnnouncementId,
        userId,
      );

      expect(result.success).toBe(true);
      expect(mockPlatformModel.updateOne).toHaveBeenCalledWith(
        { _id: uuidAnnouncementId },
        { $addToSet: { dismissedBy: expect.any(Object) } },
      );
    });

    it('✓ ObjectId-string announcement can be dismissed safely', async () => {
      const objAnnouncementId = new Types.ObjectId();
      const userId = new Types.ObjectId().toHexString();

      mockPlatformModel.findById.mockResolvedValue({
        _id: objAnnouncementId,
        title: 'New Feature Launch',
        allowDismiss: true,
        dismissedBy: [],
      });

      mockPlatformModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });
      mockMasterModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const result = await announcementsService.dismissAnnouncement(
        objAnnouncementId.toHexString(),
        userId,
      );

      expect(result.success).toBe(true);
      expect(mockPlatformModel.updateOne).toHaveBeenCalledWith(
        { _id: objAnnouncementId },
        { $addToSet: { dismissedBy: expect.any(Object) } },
      );
    });

    it('✓ Already-dismissed announcement is idempotent and safe to repeat', async () => {
      const uuidId = 'e2b3c4d5-1111-2222-3333-444455556666';
      const userId = new Types.ObjectId().toHexString();

      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: uuidId,
          title: 'Already Dismissed',
          allowDismiss: true,
          dismissedBy: [userId],
        }),
      });

      const result = await announcementsService.dismissAnnouncement(uuidId, userId);

      expect(result.success).toBe(true);
      expect(result.alreadyDismissed).toBe(true);
      // updateOne should not even be called when already dismissed
      expect(mockPlatformModel.updateOne).not.toHaveBeenCalled();
    });

    it('✓ Invalid announcement ID returns structured 400 INVALID_ANNOUNCEMENT_ID', async () => {
      const userId = new Types.ObjectId().toHexString();

      await expect(
        announcementsService.dismissAnnouncement('', userId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        announcementsService.dismissAnnouncement('   ', userId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        announcementsService.dismissAnnouncement(null as any, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Unknown announcement returns structured 404 ANNOUNCEMENT_NOT_FOUND', async () => {
      const unknownUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const userId = new Types.ObjectId().toHexString();

      mockPlatformModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockPlatformModel.updateOne.mockResolvedValue({ matchedCount: 0 });
      mockMasterModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        announcementsService.dismissAnnouncement(unknownUuid, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('✓ Frontend NotificationContext specifies retry: false on dismiss mutations', () => {
      const ctxPath = path.resolve(
        __dirname,
        '../../../frontend/src/context/NotificationContext.jsx',
      );
      expect(fs.existsSync(ctxPath)).toBe(true);
      const ctxContent = fs.readFileSync(ctxPath, 'utf8');

      expect(ctxContent).toContain('retry: false');
    });

    it('✓ Frontend AnnouncementBanner has isDismissing guard to prevent double-clicks', () => {
      const bannerPath = path.resolve(
        __dirname,
        '../../../frontend/src/components/announcements/AnnouncementBanner.jsx',
      );
      expect(fs.existsSync(bannerPath)).toBe(true);
      const bannerContent = fs.readFileSync(bannerPath, 'utf8');

      expect(bannerContent).toContain('isDismissing');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P2 — Error Capture & Authentication Telemetry
  // ─────────────────────────────────────────────────────────────
  describe('P2: Error Capture Policy & Telemetry Severity', () => {
    it('✓ Routine token expiry is logged as DEBUG TOKEN_EXPIRED, not WARN AUTH_FAILURE', () => {
      const filter = new GlobalExceptionFilter();
      const loggerSpyDebug = jest.spyOn((filter as any).logger, 'debug').mockImplementation();
      const loggerSpyWarn = jest.spyOn((filter as any).logger, 'warn').mockImplementation();

      const expiredTime = Math.floor(Date.now() / 1000) - 300; // expired 5 mins ago
      const payload = Buffer.from(
        JSON.stringify({ userId: 'u1', deviceId: 'd1', exp: expiredTime }),
      ).toString('base64url');
      const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

      const mockRequest: any = {
        method: 'GET',
        url: '/api/profile/me',
        headers: {
          authorization: `Bearer ${fakeToken}`,
        },
      };

      const mockResponse: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost: any = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      const httpException = new BadRequestException('Unauthorized');
      (httpException as any).status = 401;
      (httpException as any).getStatus = () => 401;

      filter.catch(httpException, mockHost);

      expect(loggerSpyDebug).toHaveBeenCalled();
      const debugArg = JSON.parse(loggerSpyDebug.mock.calls[0][0] as string);
      expect(debugArg.event).toBe('TOKEN_EXPIRED');
      expect(debugArg.tokenExpiryState).toMatch(/^EXPIRED_AT_/);
      expect(loggerSpyWarn).not.toHaveBeenCalled();
    });

    it('✓ Missing token on protected endpoint is logged as WARN AUTH_FAILURE', () => {
      const filter = new GlobalExceptionFilter();
      const loggerSpyWarn = jest.spyOn((filter as any).logger, 'warn').mockImplementation();

      const mockRequest: any = {
        method: 'POST',
        url: '/api/messages/send',
        headers: {},
      };

      const mockResponse: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost: any = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      const httpException = new BadRequestException('Unauthorized');
      (httpException as any).getStatus = () => 401;

      filter.catch(httpException, mockHost);

      expect(loggerSpyWarn).toHaveBeenCalled();
      const warnArg = JSON.parse(loggerSpyWarn.mock.calls[0][0] as string);
      expect(warnArg.event).toBe('AUTH_FAILURE');
      expect(warnArg.tokenExpiryState).toBe('NO_TOKEN');
    });

    it('✓ Expected /auth/me 401 check is logged at DEBUG severity', () => {
      const filter = new GlobalExceptionFilter();
      const loggerSpyDebug = jest.spyOn((filter as any).logger, 'debug').mockImplementation();
      const loggerSpyWarn = jest.spyOn((filter as any).logger, 'warn').mockImplementation();

      const mockRequest: any = {
        method: 'GET',
        url: '/api/auth/me',
        headers: {},
      };

      const mockResponse: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost: any = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      const httpException = new BadRequestException('Unauthorized');
      (httpException as any).getStatus = () => 401;

      filter.catch(httpException, mockHost);

      expect(loggerSpyDebug).toHaveBeenCalledWith(
        expect.stringContaining('Expected unauthenticated session check'),
      );
      expect(loggerSpyWarn).not.toHaveBeenCalled();
    });

    it('✓ errorCapture.ts defines all 7 required ErrorCategory classifications', () => {
      const errorCapturePath = path.resolve(
        __dirname,
        '../../../frontend/src/utils/errorCapture.ts',
      );
      expect(fs.existsSync(errorCapturePath)).toBe(true);
      const content = fs.readFileSync(errorCapturePath, 'utf8');

      expect(content).toContain('EXPECTED_AUTH');
      expect(content).toContain('RECOVERABLE_AUTH');
      expect(content).toContain('USER_ACTION_ERROR');
      expect(content).toContain('REAL_APPLICATION_ERROR');
      expect(content).toContain('NETWORK_TRANSIENT');
      expect(content).toContain('WEBSOCKET_TRANSIENT');
      expect(content).toContain('EXTERNAL_BROWSER_NOISE');
      expect(content).toContain('getSignificantErrorCount');
    });

    it('✓ api.ts does not send expected auth checks or expired sessions to logClientError', () => {
      const apiTsPath = path.resolve(
        __dirname,
        '../../../frontend/src/services/api.ts',
      );
      expect(fs.existsSync(apiTsPath)).toBe(true);
      const content = fs.readFileSync(apiTsPath, 'utf8');

      expect(content).toContain('isExpectedAuth401');
      expect(content).toContain('shouldLogTelemetry');
    });

    it('✓ ClassView.jsx progress persistence is token-aware and uses interceptor API', () => {
      const classViewPath = path.resolve(
        __dirname,
        '../../../frontend/src/pages/courses/ClassView.jsx',
      );
      expect(fs.existsSync(classViewPath)).toBe(true);
      const content = fs.readFileSync(classViewPath, 'utf8');

      // Proactive token refresh during playback
      expect(content).toContain('getRefreshedToken');
      // Token-aware guard before keepalive fetch
      expect(content).toContain('Token already expired; do not send expired token beacon');
      // Visibility and unmount use interceptor-aware persistProgress
      expect(content).toContain('void persistProgress({ force: true });');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P3 — Moderation ObjectId Validation
  // ─────────────────────────────────────────────────────────────
  describe('P3: Moderation ObjectId Validation', () => {
    let moderationService: ModerationService;
    let mockBlockModel: any;
    let mockReportModel: any;

    beforeEach(async () => {
      mockBlockModel = {
        findOne: jest.fn(),
        create: jest.fn(),
        deleteOne: jest.fn(),
        find: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      mockReportModel = {
        create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ModerationService,
          {
            provide: getModelToken(Block.name),
            useValue: mockBlockModel,
          },
          {
            provide: getModelToken(Report.name),
            useValue: mockReportModel,
          },
        ],
      }).compile();

      moderationService = module.get<ModerationService>(ModerationService);
    });

    it('✓ Invalid blockerId throws structured 400 INVALID_ID_FORMAT without BSON 500', async () => {
      const validId = new Types.ObjectId().toHexString();

      await expect(
        moderationService.blockUser('invalid-blocker-id', validId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        moderationService.blockUser(validId, 'invalid-target-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Invalid unblockUser IDs throw structured 400 INVALID_ID_FORMAT', async () => {
      const validId = new Types.ObjectId().toHexString();

      await expect(
        moderationService.unblockUser('bad-id', validId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        moderationService.unblockUser(validId, 'bad-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ Invalid userId in getExcludedUserIds throws structured 400 INVALID_ID_FORMAT', async () => {
      await expect(
        moderationService.getExcludedUserIds('not-an-object-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('✓ hasBlockRelationship returns false safely on invalid IDs without crashing', async () => {
      const result = await moderationService.hasBlockRelationship(
        'invalid-user-1',
        'invalid-user-2',
      );
      expect(result).toBe(false);
    });

    it('✓ createReport validates reporterId and targetId format safely', async () => {
      const validId = new Types.ObjectId().toHexString();

      // Invalid reporterId
      await expect(
        moderationService.createReport('invalid-rep', {
          targetType: ReportTargetType.USER,
          targetId: validId,
          reason: 'Spam',
        }),
      ).rejects.toThrow(BadRequestException);

      // Missing targetId
      await expect(
        moderationService.createReport(validId, {
          targetType: ReportTargetType.USER,
          targetId: '',
          reason: 'Spam',
        }),
      ).rejects.toThrow(BadRequestException);

      // Invalid user targetId when targetType is USER
      await expect(
        moderationService.createReport(validId, {
          targetType: ReportTargetType.USER,
          targetId: 'invalid-user-hex',
          reason: 'Harassment',
        }),
      ).rejects.toThrow(BadRequestException);

      // Valid report creation
      const validTarget = new Types.ObjectId().toHexString();
      await moderationService.createReport(validId, {
        targetType: ReportTargetType.USER,
        targetId: validTarget,
        reason: 'Harassment',
      });
      expect(mockReportModel.create).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // P3 — WebSocket Reverse Proxy & Gateways
  // ─────────────────────────────────────────────────────────────
  describe('P3: Socket.IO Gateways & WebSocket Configuration', () => {
    let messagesGateway: MessagesGateway;
    let notificationsGateway: NotificationsGateway;
    let mockJwtService: any;

    beforeEach(async () => {
      mockJwtService = {
        verify: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MessagesGateway,
          NotificationsGateway,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();

      messagesGateway = module.get<MessagesGateway>(MessagesGateway);
      notificationsGateway = module.get<NotificationsGateway>(NotificationsGateway);
    });

    it('✓ MessagesGateway is configured on /messages namespace with path /api/socket.io/', () => {
      const metadata = Reflect.getMetadata('websockets:gateway_options', MessagesGateway) ||
        Reflect.getMetadata('websockets:namespace', MessagesGateway);
      expect(messagesGateway).toBeDefined();

      const gatewayFilePath = path.resolve(
        __dirname,
        '../../../backend/src/modules/messaging/messages.gateway.ts',
      );
      const content = fs.readFileSync(gatewayFilePath, 'utf8');
      expect(content).toContain("namespace: '/messages'");
      expect(content).toContain("path: '/api/socket.io/'");
    });

    it('✓ NotificationsGateway is configured on /notifications namespace with path /api/socket.io/', () => {
      expect(notificationsGateway).toBeDefined();

      const gatewayFilePath = path.resolve(
        __dirname,
        '../../../backend/src/modules/notifications/notifications.gateway.ts',
      );
      const content = fs.readFileSync(gatewayFilePath, 'utf8');
      expect(content).toContain("namespace: '/notifications'");
      expect(content).toContain("path: '/api/socket.io/'");
    });

    it('✓ Unauthenticated connection to MessagesGateway is safely disconnected', async () => {
      const mockClient: any = {
        id: 'unauth-client-1',
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
        disconnect: jest.fn(),
      };

      await messagesGateway.handleConnection(mockClient);
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('✓ Unauthenticated connection to NotificationsGateway is safely disconnected', async () => {
      const mockClient: any = {
        id: 'unauth-client-2',
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
        disconnect: jest.fn(),
      };

      await notificationsGateway.handleConnection(mockClient);
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });
});
