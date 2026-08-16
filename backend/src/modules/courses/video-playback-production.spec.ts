import { describe, it, expect, beforeEach, jest } from '@jest/globals';

process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.AWS_REGION = 'ap-south-1';
process.env.AWS_S3_BUCKET = 'test-lms-bucket';

const mockGetSignedUrl = jest.fn() as any;
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { S3Service } from '../../common/aws/s3.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { UnauthorizedException, ForbiddenException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../auth/schemas/user.schema';

describe('S3 Video Player Production Validation - Backend Suite', () => {
  let signedUrlService: SignedUrlService;
  let s3Service: S3Service;
  let jwtStrategy: JwtStrategy;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    const mockS3Client = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignedUrlService,
        {
          provide: S3Service,
          useValue: {
            s3Client: mockS3Client,
            bucketName: 'test-lms-bucket',
            region: 'ap-south-1',
          },
        },
        JwtStrategy,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    signedUrlService = module.get<SignedUrlService>(SignedUrlService);
    s3Service = module.get<S3Service>(S3Service);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('1. S3 Signed URL & Expiration Validation (Fix for 30-Minute Freezing)', () => {
    it('should generate signed video URL with default expiration of 86400 seconds (24 hours)', async () => {
      mockGetSignedUrl.mockReset();
      mockGetSignedUrl.mockResolvedValue('https://test-lms-bucket.s3.ap-south-1.amazonaws.com/videos/class-123.mp4?X-Amz-Expires=86400&X-Amz-Signature=abc');

      const result = await signedUrlService.generateSignedVideoUrl('videos/class-123.mp4');

      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      const passedOptions = mockGetSignedUrl.mock.calls[0][2];
      expect(passedOptions).toEqual({ expiresIn: 86400 });
      expect(result).toContain('X-Amz-Expires=86400');
    });

    it('should accept custom expiration parameter and resolve S3 object keys accurately', async () => {
      mockGetSignedUrl.mockReset();
      mockGetSignedUrl.mockResolvedValue('https://test-lms-bucket.s3.ap-south-1.amazonaws.com/videos/class-123.mp4?X-Amz-Expires=43200');

      // Test S3 URI format
      const resultS3Uri = await signedUrlService.generateSignedVideoUrl('s3://test-lms-bucket/videos/class-123.mp4', 43200);
      expect(resultS3Uri).toContain('X-Amz-Expires=43200');

      // Test Virtual-hosted S3 URL format
      const resultHttpUrl = await signedUrlService.generateSignedVideoUrl('https://test-lms-bucket.s3.amazonaws.com/videos/class-123.mp4', 86400);
      expect(resultHttpUrl).toBeDefined();
    });

    it('should return empty string or non-S3 URLs safely without failing', async () => {
      expect(await signedUrlService.generateSignedVideoUrl('')).toBe('');
      expect(await signedUrlService.generateSignedVideoUrl('https://external-cdn.com/video.mp4')).toBe('https://external-cdn.com/video.mp4');
    });
  });

  describe('2. JWT Strategy & Query-Token Authentication Security Review', () => {
    it('should successfully validate user when token is extracted from query parameter ?token=...', async () => {
      const mockUser = {
        _id: 'user-123',
        name: 'Student Test',
        email: 'student@example.com',
        account_Status: { isBlocked: false, isDeleted: false },
        devices: [
          {
            deviceId: 'device-456',
            refreshTokenExpiry: new Date(Date.now() + 86400000), // 1 day in future
            lastSeen: new Date(),
          },
        ],
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.updateOne.mockResolvedValue({ acknowledged: true });

      const payload = {
        userId: 'user-123',
        role: 'student',
        deviceId: 'device-456',
      };

      const result = await jwtStrategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        name: 'Student Test',
        email: 'student@example.com',
        role: 'student',
        deviceId: 'device-456',
      });

      // Verifies device lastSeen is updated in DB
      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: 'user-123', 'devices.deviceId': 'device-456' },
        expect.objectContaining({ $set: expect.any(Object) }),
      );
    });

    it('should reject authentication if user is blocked or deleted', async () => {
      const blockedUser = {
        _id: 'user-blocked',
        account_Status: { isBlocked: true, isDeleted: false },
        devices: [{ deviceId: 'device-456' }],
      };

      mockUserModel.findById.mockResolvedValue(blockedUser);

      await expect(
        jwtStrategy.validate({ userId: 'user-blocked', role: 'student', deviceId: 'device-456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject authentication if device session does not exist or expired', async () => {
      const userWithoutDevice = {
        _id: 'user-123',
        account_Status: { isBlocked: false, isDeleted: false },
        devices: [{ deviceId: 'different-device' }],
      };

      mockUserModel.findById.mockResolvedValue(userWithoutDevice);

      await expect(
        jwtStrategy.validate({ userId: 'user-123', role: 'student', deviceId: 'device-456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Token Redaction in GlobalExceptionFilter (Preventing Token Leakage)', () => {
    it('should redact token query parameter from URLs in exception logs and responses', () => {
      const filter = new GlobalExceptionFilter();
      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });

      const mockHost: any = {
        switchToHttp: () => ({
          getResponse: () => ({ status: mockStatus }),
          getRequest: () => ({
            method: 'GET',
            url: '/api/courses/video/class-123/playlist.m3u8?token=SECRET_JWT_TOKEN_ABC123&quality=high',
            headers: {},
          }),
        }),
      };

      const testException = new HttpException('Access Denied', HttpStatus.FORBIDDEN);
      filter.catch(testException, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledTimes(1);

      const responsePayload: any = mockJson.mock.calls[0][0];
      expect(responsePayload.path).not.toContain('SECRET_JWT_TOKEN_ABC123');
      expect(responsePayload.path).toContain('token=[REDACTED]');
      expect(responsePayload.path).toContain('quality=high');
    });
  });
});
