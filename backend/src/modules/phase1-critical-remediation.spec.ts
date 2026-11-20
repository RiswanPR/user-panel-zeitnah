import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import express, { Express } from 'express';
import { MessagesGateway } from './messaging/messages.gateway';
import { MessagingService } from './messaging/messaging.service';
import { CommunityGateway } from './community/gateways/community.gateway';
import { CoursesService } from './courses/courses.service';
import {
  getTrustProxyConfig,
  getTrustedClientIp,
  normalizeIp,
  isCloudflareOriginIp,
} from '../config/proxy.config';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 1 Critical Security Remediation Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // Finding 1: WebSocket Conversation Authorization (MessagesGateway)
  // =========================================================================
  describe('Finding 1: MessagesGateway Authorization & Room Subscriptions', () => {
    let gateway: MessagesGateway;
    let mockMessagingService: { isUserParticipant: jest.Mock };
    let mockJwtService: { verify: jest.Mock };

    beforeEach(async () => {
      mockMessagingService = {
        isUserParticipant: jest.fn(),
      };
      mockJwtService = {
        verify: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MessagesGateway,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
          {
            provide: MessagingService,
            useValue: mockMessagingService,
          },
        ],
      }).compile();

      gateway = module.get<MessagesGateway>(MessagesGateway);
    });

    it('✓ Allows verified conversation participants to join conversation room', async () => {
      const validConvId = '507f1f77bcf86cd799439011';
      const userId = 'user-auth-123';
      const mockClient: any = {
        id: 'client-participant',
        data: { userId },
        join: jest.fn().mockResolvedValue(undefined),
        emit: jest.fn(),
      };

      mockMessagingService.isUserParticipant.mockResolvedValue(true);

      await gateway.handleJoinConversation(mockClient, {
        conversationId: validConvId,
      });

      expect(mockMessagingService.isUserParticipant).toHaveBeenCalledWith(
        validConvId,
        userId,
      );
      expect(mockClient.join).toHaveBeenCalledWith(
        `conversation_${validConvId}`,
      );
      expect(mockClient.emit).toHaveBeenCalledWith('joined_conversation', {
        conversationId: validConvId,
      });
      expect(mockClient.emit).not.toHaveBeenCalledWith(
        'error',
        expect.anything(),
      );
    });

    it('✓ Rejects non-participants with FORBIDDEN error and prevents room join', async () => {
      const validConvId = '507f1f77bcf86cd799439011';
      const victimConvId = validConvId;
      const attackerUserId = 'attacker-user-999';
      const mockClient: any = {
        id: 'client-attacker',
        data: { userId: attackerUserId },
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockMessagingService.isUserParticipant.mockResolvedValue(false);

      await gateway.handleJoinConversation(mockClient, {
        conversationId: victimConvId,
      });

      expect(mockMessagingService.isUserParticipant).toHaveBeenCalledWith(
        victimConvId,
        attackerUserId,
      );
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        code: 'FORBIDDEN',
        message: 'You are not a participant in this conversation',
      });
    });

    it('✓ Rejects unauthenticated socket clients attempting to join rooms', async () => {
      const validConvId = '507f1f77bcf86cd799439011';
      const mockClient: any = {
        id: 'client-unauth',
        data: {}, // No userId in socket data
        join: jest.fn(),
        emit: jest.fn(),
      };

      await gateway.handleJoinConversation(mockClient, {
        conversationId: validConvId,
      });

      expect(mockMessagingService.isUserParticipant).not.toHaveBeenCalled();
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required to join conversation',
      });
    });

    it('✓ Rejects malformed or invalid conversation IDs', async () => {
      const mockClient: any = {
        id: 'client-invalid-id',
        data: { userId: 'valid-user-1' },
        join: jest.fn(),
        emit: jest.fn(),
      };

      // Case 1: Non-hex string
      await gateway.handleJoinConversation(mockClient, {
        conversationId: 'invalid-id-xyz',
      });
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        code: 'INVALID_CONVERSATION_ID',
        message: expect.stringContaining('24-character hexadecimal'),
      });

      // Case 2: Empty string
      await gateway.handleJoinConversation(mockClient, {
        conversationId: '',
      });
      expect(mockClient.join).not.toHaveBeenCalled();

      // Case 3: Missing payload
      await gateway.handleJoinConversation(mockClient, undefined);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('✓ Fails closed when MessagingService authorization service is missing/unavailable', async () => {
      const bareModule: TestingModule = await Test.createTestingModule({
        providers: [
          MessagesGateway,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();

      const bareGateway = bareModule.get<MessagesGateway>(MessagesGateway);
      const validConvId = '507f1f77bcf86cd799439011';
      const mockClient: any = {
        id: 'client-no-service',
        data: { userId: 'user-auth-123' },
        join: jest.fn(),
        emit: jest.fn(),
      };

      await bareGateway.handleJoinConversation(mockClient, {
        conversationId: validConvId,
      });

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Authorization service is unavailable',
      });
    });

    it('✓ Fails closed when MessagingService throws an unexpected error', async () => {
      const validConvId = '507f1f77bcf86cd799439011';
      const mockClient: any = {
        id: 'client-err',
        data: { userId: 'user-auth-123' },
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockMessagingService.isUserParticipant.mockRejectedValue(
        new Error('Database connectivity error'),
      );

      await gateway.handleJoinConversation(mockClient, {
        conversationId: validConvId,
      });

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify conversation membership',
      });
    });

    it('✓ Prevents clients outside conversation room from broadcasting typing events', () => {
      const convId = '507f1f77bcf86cd799439011';
      const roomName = `conversation_${convId}`;
      const toEmitMock = jest.fn();
      const mockClient: any = {
        id: 'client-typing-eavesdropper',
        data: { userId: 'eavesdropper-1', user: { name: 'Mallory' } },
        rooms: new Set(['user_eavesdropper-1']), // Client is NOT in conversation room
        to: jest.fn().mockReturnValue({ emit: toEmitMock }),
      };

      gateway.handleTyping(mockClient, {
        conversationId: convId,
        isTyping: true,
      });

      expect(mockClient.to).not.toHaveBeenCalled();
      expect(toEmitMock).not.toHaveBeenCalled();

      // Now join the client to the room and verify typing broadcast is permitted
      mockClient.rooms.add(roomName);
      gateway.handleTyping(mockClient, {
        conversationId: convId,
        isTyping: true,
      });

      expect(mockClient.to).toHaveBeenCalledWith(roomName);
      expect(toEmitMock).toHaveBeenCalledWith('user_typing', {
        conversationId: convId,
        userId: 'eavesdropper-1',
        userName: 'Mallory',
        isTyping: true,
      });
    });

    it('✓ Allows leaving a joined conversation safely', async () => {
      const convId = '507f1f77bcf86cd799439011';
      const mockClient: any = {
        id: 'client-leave',
        data: { userId: 'user-1' },
        leave: jest.fn().mockResolvedValue(undefined),
        emit: jest.fn(),
      };

      await gateway.handleLeaveConversation(mockClient, {
        conversationId: convId,
      });

      expect(mockClient.leave).toHaveBeenCalledWith(`conversation_${convId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('left_conversation', {
        conversationId: convId,
      });
    });
  });

  // =========================================================================
  // Finding 2: IP Spoofing & Throttler Bypass
  // =========================================================================
  describe('Finding 2: IP Spoofing Prevention & Constrained Proxy Trust', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      const trustConfig = getTrustProxyConfig();
      app.set('trust proxy', trustConfig);
    });

    it('✓ getTrustProxyConfig defaults to safe constrained subnets, never unconditional true', () => {
      delete process.env.TRUST_PROXY;
      delete process.env.NODE_ENV;
      const config = getTrustProxyConfig();
      expect(config).toEqual(['loopback', 'linklocal', 'uniquelocal']);
      expect(config).not.toBe(true);

      process.env.TRUST_PROXY = '1';
      expect(getTrustProxyConfig()).toBe(1);

      process.env.TRUST_PROXY = '10.0.0.0/8, 172.16.0.0/12';
      expect(getTrustProxyConfig()).toEqual(['10.0.0.0/8', '172.16.0.0/12']);

      process.env.TRUST_PROXY = 'false';
      expect(getTrustProxyConfig()).toBe(false);
    });

    it('✓ Throws in production when TRUST_PROXY="true" is configured', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRUST_PROXY = 'true';
      expect(() => getTrustProxyConfig()).toThrow(
        /CRITICAL SECURITY CONFIGURATION ERROR/,
      );
    });

    it('✓ Validates Cloudflare edge IP subnets (isCloudflareOriginIp)', () => {
      expect(isCloudflareOriginIp('173.245.48.5')).toBe(true);
      expect(isCloudflareOriginIp('104.16.12.34')).toBe(true);
      expect(isCloudflareOriginIp('2400:cb00::1')).toBe(true);
      expect(isCloudflareOriginIp('198.51.100.99')).toBe(false);
      expect(isCloudflareOriginIp('127.0.0.1')).toBe(false);
      expect(isCloudflareOriginIp(null)).toBe(false);
    });

    it('✓ Rejects spoofed X-Forwarded-For from direct public client connections', () => {
      const directPublicIp = '198.51.100.99';
      const mockReq: any = {
        app,
        headers: {
          'x-forwarded-for': '1.1.1.1, 2.2.2.2',
        },
        connection: { remoteAddress: directPublicIp },
        socket: { remoteAddress: directPublicIp },
      };
      Object.setPrototypeOf(mockReq, app.request);

      expect(mockReq.ip).toBe(directPublicIp);

      const resolvedClientIp = getTrustedClientIp(mockReq);
      expect(resolvedClientIp).toBe(directPublicIp);
      expect(resolvedClientIp).not.toBe('1.1.1.1');
    });

    it('✓ Rejects spoofed CF-Connecting-IP from direct public client connections', () => {
      process.env.TRUST_CLOUDFLARE = 'true';
      const directPublicIp = '198.51.100.99';
      const mockReq: any = {
        app,
        headers: {
          'cf-connecting-ip': '8.8.8.8',
          'x-forwarded-for': '8.8.8.8',
        },
        connection: { remoteAddress: directPublicIp },
        socket: { remoteAddress: directPublicIp },
      };
      Object.setPrototypeOf(mockReq, app.request);

      const resolvedClientIp = getTrustedClientIp(mockReq);
      expect(resolvedClientIp).toBe(directPublicIp);
      expect(resolvedClientIp).not.toBe('8.8.8.8');
    });

    it('✓ Accepts CF-Connecting-IP when incoming socket is verified Cloudflare IP', () => {
      process.env.TRUST_CLOUDFLARE = 'true';
      const cfEdgeIp = '173.245.48.10'; // Valid Cloudflare subnet IP
      const realClientIp = '203.0.113.88';
      const mockReq: any = {
        app,
        headers: {
          'cf-connecting-ip': realClientIp,
        },
        connection: { remoteAddress: cfEdgeIp },
        socket: { remoteAddress: cfEdgeIp },
      };
      Object.setPrototypeOf(mockReq, app.request);

      const resolvedClientIp = getTrustedClientIp(mockReq);
      expect(resolvedClientIp).toBe(realClientIp);
    });

    it('✓ Correctly extracts verified client IP from legitimate trusted reverse proxy', () => {
      const realClientIp = '203.0.113.50';
      const trustedProxyIp = '127.0.0.1'; // Loopback is trusted
      const mockReq: any = {
        app,
        headers: {
          'x-forwarded-for': realClientIp,
        },
        connection: { remoteAddress: trustedProxyIp },
        socket: { remoteAddress: trustedProxyIp },
      };
      Object.setPrototypeOf(mockReq, app.request);

      expect(mockReq.ip).toBe(realClientIp);
      expect(getTrustedClientIp(mockReq)).toBe(realClientIp);
    });

    it('✓ Prevents client-appended spoofing through legitimate reverse proxy', () => {
      const realClientIp = '203.0.113.50';
      const attackerFakeIp = '1.1.1.1';
      const trustedProxyIp = '127.0.0.1';

      // Proxy appends realClientIp: "fake, real"
      const mockReq: any = {
        app,
        headers: {
          'x-forwarded-for': `${attackerFakeIp}, ${realClientIp}`,
        },
        connection: { remoteAddress: trustedProxyIp },
        socket: { remoteAddress: trustedProxyIp },
      };
      Object.setPrototypeOf(mockReq, app.request);

      // Trust proxy stops at the first untrusted IP (realClientIp) and ignores fake IP
      expect(mockReq.ip).toBe(realClientIp);
      expect(getTrustedClientIp(mockReq)).toBe(realClientIp);
    });

    it('✓ Normalizes IPv6-mapped IPv4 addresses and port suffixes cleanly', () => {
      expect(normalizeIp('::ffff:192.168.1.100')).toBe('192.168.1.100');
      expect(normalizeIp('192.168.1.100:54321')).toBe('192.168.1.100');
      expect(normalizeIp('  10.0.0.1  ')).toBe('10.0.0.1');
      expect(normalizeIp('')).toBe('');
      expect(normalizeIp(null)).toBe('');
    });
  });

  // =========================================================================
  // Finding 3: CommunityGateway Room Assignment & Course Authorization
  // =========================================================================
  describe('Finding 3: CommunityGateway Room Assignment & Course Authorization', () => {
    let communityGateway: CommunityGateway;
    let mockJwtService: { verify: jest.Mock };
    let mockCoursesService: { canUserAccessCourse: jest.Mock };

    beforeEach(async () => {
      mockJwtService = {
        verify: jest.fn(),
      };
      mockCoursesService = {
        canUserAccessCourse: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CommunityGateway,
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
          {
            provide: CoursesService,
            useValue: mockCoursesService,
          },
        ],
      }).compile();

      communityGateway = module.get<CommunityGateway>(CommunityGateway);
      communityGateway.server = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        emit: jest.fn(),
      } as any;
    });

    it('✓ Two authenticated users join separate private notification rooms using canonical userId', async () => {
      const userAId = 'user-alice-111';
      const userBId = 'user-bob-222';

      mockJwtService.verify.mockImplementation((token: string) => {
        if (token === 'token-alice')
          return { userId: userAId, role: 'student' };
        if (token === 'token-bob') return { userId: userBId, role: 'teacher' };
        throw new Error('invalid token');
      });

      const clientAlice: any = {
        id: 'sock-alice',
        handshake: { auth: { token: 'token-alice' } },
        data: {},
        join: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
      };

      const clientBob: any = {
        id: 'sock-bob',
        handshake: { auth: { token: 'token-bob' } },
        data: {},
        join: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
      };

      await communityGateway.handleConnection(clientAlice);
      await communityGateway.handleConnection(clientBob);

      expect(clientAlice.join).toHaveBeenCalledWith(`user_${userAId}`);
      expect(clientBob.join).toHaveBeenCalledWith(`user_${userBId}`);
      expect(clientAlice.join).not.toHaveBeenCalledWith(`user_${userBId}`);
      expect(clientBob.join).not.toHaveBeenCalledWith(`user_${userAId}`);
    });

    it('✓ Direct notifications reach the intended user room without leak', () => {
      const targetUserId = 'target-student-456';
      const notification = { title: 'Assignment Graded', score: 100 };

      const toEmitMock = jest.fn();
      const toSpy = jest.fn().mockReturnValue({ emit: toEmitMock });
      communityGateway.server.to = toSpy;

      communityGateway.emitNotification(targetUserId, notification);

      expect(toSpy).toHaveBeenCalledWith(`user_${targetUserId}`);
      expect(toEmitMock).toHaveBeenCalledWith('new_notification', notification);
    });

    it('✓ Never binds or joins user_undefined when claims are missing or malformed', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: undefined,
        _id: undefined,
        userId: undefined,
      });

      const clientMissing: any = {
        id: 'sock-missing-claims',
        handshake: { auth: { token: 'token-empty-claims' } },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await communityGateway.handleConnection(clientMissing);

      expect(clientMissing.join).not.toHaveBeenCalledWith('user_undefined');
      expect(clientMissing.join).not.toHaveBeenCalled();
      expect(clientMissing.disconnect).toHaveBeenCalled();
    });

    it('✓ Rejects unauthenticated connections missing auth tokens', async () => {
      const clientNoToken: any = {
        id: 'sock-no-token',
        handshake: { auth: {}, headers: {}, query: {} },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await communityGateway.handleConnection(clientNoToken);

      expect(clientNoToken.join).not.toHaveBeenCalled();
      expect(clientNoToken.disconnect).toHaveBeenCalled();
    });

    describe('Course Room Authorization (handleJoinCourseRoom)', () => {
      const courseId = '507f1f77bcf86cd799439033';
      const studentId = '507f1f77bcf86cd799439044';

      it('✓ Allows enrolled students to join course rooms', async () => {
        mockCoursesService.canUserAccessCourse.mockResolvedValue(true);

        const mockClient: any = {
          id: 'client-enrolled-student',
          data: { userId: studentId, user: { role: 'student' } },
          join: jest.fn().mockResolvedValue(undefined),
          emit: jest.fn(),
        };

        await communityGateway.handleJoinCourseRoom({ courseId }, mockClient);

        expect(mockCoursesService.canUserAccessCourse).toHaveBeenCalledWith(
          courseId,
          studentId,
          'student',
        );
        expect(mockClient.join).toHaveBeenCalledWith(`course_${courseId}`);
        expect(mockClient.emit).toHaveBeenCalledWith('joined_course_room', {
          courseId,
        });
      });

      it('✓ Rejects non-enrolled students with FORBIDDEN error and prevents course room join', async () => {
        mockCoursesService.canUserAccessCourse.mockResolvedValue(false);

        const mockClient: any = {
          id: 'client-non-enrolled',
          data: { userId: studentId, user: { role: 'student' } },
          join: jest.fn(),
          emit: jest.fn(),
        };

        await communityGateway.handleJoinCourseRoom({ courseId }, mockClient);

        expect(mockClient.join).not.toHaveBeenCalled();
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'FORBIDDEN',
          message: 'You are not authorized to access this course room',
        });
      });

      it('✓ Allows authorized educators to join course rooms', async () => {
        const educatorId = '507f1f77bcf86cd799439055';
        mockCoursesService.canUserAccessCourse.mockResolvedValue(true);

        const mockClient: any = {
          id: 'client-educator',
          data: { userId: educatorId, user: { role: 'teacher' } },
          join: jest.fn().mockResolvedValue(undefined),
          emit: jest.fn(),
        };

        await communityGateway.handleJoinCourseRoom({ courseId }, mockClient);

        expect(mockCoursesService.canUserAccessCourse).toHaveBeenCalledWith(
          courseId,
          educatorId,
          'teacher',
        );
        expect(mockClient.join).toHaveBeenCalledWith(`course_${courseId}`);
        expect(mockClient.emit).toHaveBeenCalledWith('joined_course_room', {
          courseId,
        });
      });

      it('✓ Allows authorized administrators to join course rooms', async () => {
        const adminId = '507f1f77bcf86cd799439066';
        mockCoursesService.canUserAccessCourse.mockResolvedValue(true);

        const mockClient: any = {
          id: 'client-admin',
          data: { userId: adminId, user: { role: 'admin' } },
          join: jest.fn().mockResolvedValue(undefined),
          emit: jest.fn(),
        };

        await communityGateway.handleJoinCourseRoom({ courseId }, mockClient);

        expect(mockCoursesService.canUserAccessCourse).toHaveBeenCalledWith(
          courseId,
          adminId,
          'admin',
        );
        expect(mockClient.join).toHaveBeenCalledWith(`course_${courseId}`);
        expect(mockClient.emit).toHaveBeenCalledWith('joined_course_room', {
          courseId,
        });
      });

      it('✓ Rejects invalid course IDs', async () => {
        const mockClient: any = {
          id: 'client-invalid-course',
          data: { userId: studentId },
          join: jest.fn(),
          emit: jest.fn(),
        };

        await communityGateway.handleJoinCourseRoom(
          { courseId: 'invalid-course-xyz' },
          mockClient,
        );

        expect(mockCoursesService.canUserAccessCourse).not.toHaveBeenCalled();
        expect(mockClient.join).not.toHaveBeenCalled();
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'INVALID_COURSE_ID',
          message: expect.stringContaining('24-character hexadecimal'),
        });
      });

      it('✓ Fails closed when authorization service is missing/unavailable', async () => {
        const bareModule: TestingModule = await Test.createTestingModule({
          providers: [
            CommunityGateway,
            {
              provide: JwtService,
              useValue: mockJwtService,
            },
          ],
        }).compile();

        const bareGateway = bareModule.get<CommunityGateway>(CommunityGateway);
        const mockClient: any = {
          id: 'client-no-courses-service',
          data: { userId: studentId },
          join: jest.fn(),
          emit: jest.fn(),
        };

        await bareGateway.handleJoinCourseRoom({ courseId }, mockClient);

        expect(mockClient.join).not.toHaveBeenCalled();
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Course authorization service is unavailable',
        });
      });

      it('✓ Fails closed when authorization service throws an error', async () => {
        mockCoursesService.canUserAccessCourse.mockRejectedValue(
          new Error('Service failure or timeout'),
        );

        const mockClient: any = {
          id: 'client-err',
          data: { userId: studentId },
          join: jest.fn(),
          emit: jest.fn(),
        };

        await communityGateway.handleJoinCourseRoom({ courseId }, mockClient);

        expect(mockClient.join).not.toHaveBeenCalled();
        expect(mockClient.emit).toHaveBeenCalledWith('error', {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify course authorization',
        });
      });
    });
  });

  // =========================================================================
  // Finding 4: Proxy Dependency Version Verification
  // =========================================================================
  describe('Finding 4: Dependency Hardening (proxy-addr)', () => {
    it('✓ Overrides enforce patched proxy-addr version ^2.0.8', () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const overrides = packageJson.overrides;
      expect(overrides).toBeDefined();
      expect(overrides['proxy-addr']).toBe('^2.0.8');
    });

    it('✓ Installed proxy-addr is version 2.0.8 or higher', () => {
      const proxyAddrPkg = require('proxy-addr/package.json');
      expect(proxyAddrPkg.version).toBe('2.0.8');
    });
  });
});
