/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PostSchema } from './schemas/post.schema';
import { PostType, PostAudience } from './domain/post.model';
import { PostService } from './services/post.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommunityS3Service } from './services/community-s3.service';
import { CommunityUploadController } from './controllers/community-upload.controller';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../../common/aws/s3.service';

describe('Community Media + Repost Stability Suite', () => {
  // =========================================================================
  // SECTION 1: REPOST 500 REGRESSION & DOMAIN MODEL INTEGRITY
  // =========================================================================
  describe('Phase 12 & 13: Repost Domain Model & Mongoose Validation Regression', () => {
    let PostModel: mongoose.Model<any>;

    beforeAll(() => {
      // Compile model from actual PostSchema
      PostModel =
        mongoose.models.TestPost || mongoose.model('TestPost', PostSchema);
    });

    it('repost doc with lowercase type="text" and audience="public" is canonicalized to "TEXT" and "PUBLIC" without enum validation error', async () => {
      const doc = new PostModel({
        authorId: 'user-reposter-1',
        content: '',
        postType: 'repost',
        originalPostId: 'original-post-123',
        type: 'text', // Simulating historical lowercase or payload
        audience: 'public', // Simulating historical lowercase
      });

      // Calling validate() must NOT throw "ValidationError: Post validation failed: type: `text` is not a valid enum value"
      await expect(doc.validate()).resolves.toBeUndefined();
      expect(doc.type).toBe(PostType.TEXT);
      expect(doc.audience).toBe(PostAudience.PUBLIC);
    });

    it('validates that Post.type enum rejects arbitrary strings but accepts canonical PostType', async () => {
      const invalidDoc = new PostModel({
        authorId: 'user-1',
        type: 'invalid_type_value',
        audience: 'PUBLIC',
      });

      await expect(invalidDoc.validate()).rejects.toThrow(
        mongoose.Error.ValidationError,
      );
    });

    it('preserves original post reference, author, and canonical TEXT type when reposting', async () => {
      const mockPostRepo = {
        findById: jest.fn(),
        findActiveRepost: jest.fn(),
        createRepost: jest.fn(),
        findByIdPopulated: jest.fn(),
        adjustRepostCount: jest.fn(),
      };
      const mockGateway = { emitPostCreated: jest.fn() };
      const mockNotifications = { createNotification: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PostService,
          { provide: PostRepository, useValue: mockPostRepo },
          { provide: CommunityGateway, useValue: mockGateway },
          { provide: NotificationsService, useValue: mockNotifications },
        ],
      }).compile();

      const postService = module.get<PostService>(PostService);

      const originalPost = {
        _id: 'original-post-456',
        authorId: 'original-author-id',
        content: 'Original knowledge sharing content',
        audience: 'PUBLIC',
        postType: 'original',
        type: 'TEXT',
        stats: { likes: 10, reposts: 3 },
      };

      const createdRepost = {
        _id: 'new-repost-789',
        authorId: 'reposting-user-id',
        originalPostId: 'original-post-456',
        postType: 'repost',
        type: PostType.TEXT,
        audience: PostAudience.PUBLIC,
      };

      mockPostRepo.findById.mockResolvedValue(originalPost);
      mockPostRepo.findActiveRepost.mockResolvedValue(null);
      mockPostRepo.createRepost.mockResolvedValue(createdRepost);
      mockPostRepo.findByIdPopulated.mockResolvedValue({
        ...originalPost,
        stats: { ...originalPost.stats, reposts: 4 },
      });

      const result = await postService.repostPost(
        'original-post-456',
        'reposting-user-id',
      );

      expect(result.success).toBe(true);
      expect(result.isReposted).toBe(true);
      expect(mockPostRepo.createRepost).toHaveBeenCalledWith(
        expect.objectContaining({
          originalPostId: 'original-post-456',
          authorId: 'reposting-user-id',
          audience: 'PUBLIC',
        }),
      );
      expect(mockPostRepo.adjustRepostCount).toHaveBeenCalledWith(
        'original-post-456',
        1,
      );
    });

    it('rejects repost of a deleted or nonexistent post with NotFoundException', async () => {
      const mockPostRepo = {
        findById: jest.fn().mockResolvedValue(null),
        findActiveRepost: jest.fn(),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PostService,
          { provide: PostRepository, useValue: mockPostRepo },
          {
            provide: CommunityGateway,
            useValue: { emitPostCreated: jest.fn() },
          },
          {
            provide: NotificationsService,
            useValue: { createNotification: jest.fn() },
          },
        ],
      }).compile();

      const postService = module.get<PostService>(PostService);
      await expect(
        postService.repostPost('missing-post-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces idempotency: reposting an already reposted post returns existing state without duplicate', async () => {
      const original = {
        _id: 'post-abc',
        authorId: 'author-1',
        stats: { reposts: 2 },
      };
      const existingRepost = {
        _id: 'repost-abc',
        authorId: 'reposter-1',
        originalPostId: 'post-abc',
      };

      const mockPostRepo = {
        findById: jest.fn().mockResolvedValue(original),
        findActiveRepost: jest.fn().mockResolvedValue(existingRepost),
        findByIdPopulated: jest.fn().mockResolvedValue(original),
        createRepost: jest.fn(),
        adjustRepostCount: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PostService,
          { provide: PostRepository, useValue: mockPostRepo },
          {
            provide: CommunityGateway,
            useValue: { emitPostCreated: jest.fn() },
          },
          {
            provide: NotificationsService,
            useValue: { createNotification: jest.fn() },
          },
        ],
      }).compile();

      const postService = module.get<PostService>(PostService);
      const res = await postService.repostPost('post-abc', 'reposter-1');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Already reposted');
      expect(mockPostRepo.createRepost).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 2: MEDIA UPLOADS, EXACT BOUNDARIES, STREAMING & DURATION (PHASE 14)
  // =========================================================================
  describe('Phase 14: Media Uploads, Limits & Memory Safety', () => {
    let uploadController: CommunityUploadController;
    let s3Service: CommunityS3Service;

    const mockS3Client = { send: jest.fn() };
    const mockCommonS3Service = {
      bucketName: 'test-bucket',
      region: 'eu-central-1',
      s3Client: mockS3Client,
    };

    const validReq = { user: { userId: 'user-media-tester', role: 'student' } };

    beforeEach(async () => {
      jest.clearAllMocks();

      mockS3Client.send.mockImplementation(async (command: any) => {
        if (
          command?.input?.Body &&
          typeof command.input.Body.resume === 'function'
        ) {
          // If Body is a ReadStream, consume it to completion
          await new Promise((resolve) => {
            command.input.Body.on('end', resolve);
            command.input.Body.on('error', resolve);
            command.input.Body.resume();
          });
        }
        return {};
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [CommunityUploadController],
        providers: [
          CommunityS3Service,
          { provide: S3Service, useValue: mockCommonS3Service },
        ],
      }).compile();

      uploadController = module.get<CommunityUploadController>(
        CommunityUploadController,
      );
      s3Service = module.get<CommunityS3Service>(CommunityS3Service);

      // Default mock for ffmpeg helpers so tests run cleanly and fast in unit test runner
      jest.spyOn(s3Service as any, 'optimizeImage').mockResolvedValue(false);
      jest
        .spyOn(s3Service as any, 'generateVideoPoster')
        .mockResolvedValue(null);
    });

    // --- PHOTO / IMAGE TESTS ---
    it('1. Image below 8 MiB is accepted', async () => {
      mockS3Client.send.mockResolvedValue({});
      const file = {
        fieldname: 'file',
        originalname: 'photo-small.jpg',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5 MiB
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      } as any;

      const res = await uploadController.uploadFile(file, validReq);
      expect(res).toBeDefined();
      expect(res.url).toContain('community/uploads/user-media-tester/');
    });

    it('2. Image exactly at 8 MiB boundary (8 * 1024 * 1024) is accepted', async () => {
      mockS3Client.send.mockResolvedValue({});
      const file = {
        fieldname: 'file',
        originalname: 'photo-exact.png',
        mimetype: 'image/png',
        size: 8 * 1024 * 1024, // Exactly 8 MiB
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as any;

      const res = await uploadController.uploadFile(file, validReq);
      expect(res).toBeDefined();
      expect(res.mimeType).toBe('image/png');
    });

    it('3. Image above 8 MiB (8 * 1024 * 1024 + 1) is rejected with 413 PayloadTooLargeException', async () => {
      const file = {
        fieldname: 'file',
        originalname: 'photo-too-large.png',
        mimetype: 'image/png',
        size: 8 * 1024 * 1024 + 1,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as any;

      try {
        await uploadController.uploadFile(file, validReq);
        fail('Should have thrown PayloadTooLargeException');
      } catch (err) {
        expect(err).toBeInstanceOf(PayloadTooLargeException);
        const resp: any = err.getResponse();
        expect(resp.code).toBe('FILE_TOO_LARGE');
        expect(resp.message).toContain('8 MB');
      }
    });

    it('4. Invalid image MIME type is rejected with BadRequestException', async () => {
      const file = {
        fieldname: 'file',
        originalname: 'script.js',
        mimetype: 'application/javascript',
        size: 1024,
        buffer: Buffer.from('console.log("hello");'),
      } as any;

      await expect(uploadController.uploadFile(file, validReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    // --- VIDEO TESTS ---
    it('6. Video below 1 GiB is accepted at size-validation layer', async () => {
      mockS3Client.send.mockResolvedValue({});
      jest.spyOn(s3Service, 'getVideoDuration').mockResolvedValue(45); // 45s duration

      const file = {
        fieldname: 'file',
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
        size: 500 * 1024 * 1024, // 500 MiB
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      const res = await uploadController.uploadFile(file, validReq);
      expect(res).toBeDefined();
      expect(res.duration).toBe(45);
    });

    it('7. Video exactly at 1 GiB boundary (1024 * 1024 * 1024) is accepted at size check', async () => {
      mockS3Client.send.mockResolvedValue({});
      jest.spyOn(s3Service, 'getVideoDuration').mockResolvedValue(60);

      const file = {
        fieldname: 'file',
        originalname: 'clip-boundary.mp4',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 1024, // Exactly 1 GiB
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      const res = await uploadController.uploadFile(file, validReq);
      expect(res).toBeDefined();
      expect(res.size).toBe(1024 * 1024 * 1024);
    });

    it('8. Video above 1 GiB (1024 * 1024 * 1024 + 1) is rejected with 413 PayloadTooLargeException', async () => {
      const file = {
        fieldname: 'file',
        originalname: 'huge-video.mp4',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 1024 + 1,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      try {
        await uploadController.uploadFile(file, validReq);
        fail('Should have thrown PayloadTooLargeException');
      } catch (err) {
        expect(err).toBeInstanceOf(PayloadTooLargeException);
        const resp: any = err.getResponse();
        expect(resp.code).toBe('FILE_TOO_LARGE');
        expect(resp.message).toContain('1 GB');
      }
    });

    it('9. Video <= 90 seconds (exactly 90.0s) is accepted', async () => {
      mockS3Client.send.mockResolvedValue({});
      jest.spyOn(s3Service, 'getVideoDuration').mockResolvedValue(90);

      const file = {
        fieldname: 'file',
        originalname: 'exact-90s.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      const res = await uploadController.uploadFile(file, validReq);
      expect(res).toBeDefined();
      expect(res.duration).toBe(90);
    });

    it('10. Video > 90 seconds (90.5s) is rejected with 400 BadRequestException (VIDEO_TOO_LONG)', async () => {
      jest.spyOn(s3Service, 'getVideoDuration').mockResolvedValue(90.5);

      const file = {
        fieldname: 'file',
        originalname: 'long-video.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      try {
        await uploadController.uploadFile(file, validReq);
        fail('Should have thrown BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp: any = err.getResponse();
        expect(resp.code).toBe('VIDEO_TOO_LONG');
        expect(resp.message).toBe('Video must be 90 seconds or shorter.');
      }
    });

    it('11. Invalid video MIME type is rejected', async () => {
      const file = {
        fieldname: 'file',
        originalname: 'audio.wav',
        mimetype: 'audio/wav',
        size: 1024 * 1024,
        buffer: Buffer.from([0x52, 0x49, 0x46, 0x46]),
      } as any;

      await expect(uploadController.uploadFile(file, validReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('12. Duration validation cannot be bypassed by client-supplied duration', async () => {
      // Server calls getVideoDuration which probes the actual media, ignoring client params
      const durationSpy = jest
        .spyOn(s3Service, 'getVideoDuration')
        .mockResolvedValue(120);

      const file = {
        fieldname: 'file',
        originalname: 'spoofed.mp4',
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024,
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      } as any;

      await expect(uploadController.uploadFile(file, validReq)).rejects.toThrow(
        BadRequestException,
      );
      expect(durationSpy).toHaveBeenCalled();
    });

    it('14. Temporary/orphaned disk upload is cleaned up on completion or error', async () => {
      // Create a real temp file on disk to simulate Multer disk storage
      const tempFilePath = path.join(
        os.tmpdir(),
        `test-temp-${Date.now()}.mp4`,
      );
      fs.writeFileSync(
        tempFilePath,
        Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      );

      expect(fs.existsSync(tempFilePath)).toBe(true);

      // Force an error in duration check
      jest
        .spyOn(s3Service, 'getVideoDuration')
        .mockRejectedValue(new Error('Corrupt file'));

      const file = {
        fieldname: 'file',
        originalname: 'corrupt.mp4',
        mimetype: 'video/mp4',
        size: 1024,
        path: tempFilePath,
      } as any;

      await expect(
        uploadController.uploadFile(file, validReq),
      ).rejects.toThrow();

      // Controller must clean up temp file in finally block
      expect(fs.existsSync(tempFilePath)).toBe(false);
    });

    it('15. Large video upload uses file.path stream instead of loading full buffer into memory', async () => {
      const tempFilePath = path.join(
        os.tmpdir(),
        `test-stream-${Date.now()}.mp4`,
      );
      fs.writeFileSync(
        tempFilePath,
        Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      );

      jest.spyOn(s3Service, 'getVideoDuration').mockResolvedValue(30);

      let sendParamsReceived: any = null;
      mockS3Client.send.mockImplementation(async (command: any) => {
        sendParamsReceived = command.input;
        if (
          command?.input?.Body &&
          typeof command.input.Body.resume === 'function'
        ) {
          await new Promise((resolve) => {
            command.input.Body.on('end', resolve);
            command.input.Body.on('error', resolve);
            command.input.Body.resume();
          });
        }
        return {};
      });

      const file = {
        fieldname: 'file',
        originalname: 'large-stream.mp4',
        mimetype: 'video/mp4',
        size: 500 * 1024 * 1024,
        path: tempFilePath,
        // Notice: buffer is UNDEFINED to prove zero heap buffering required
        buffer: undefined,
      } as any;

      const res = await uploadController.uploadFile(file, validReq);
      expect(res).toBeDefined();

      // Verify that S3 PutObject received a ReadStream (not a 500MB buffer)
      expect(sendParamsReceived).toBeDefined();
      expect(typeof sendParamsReceived.Body?.pipe).toBe('function'); // It's a stream!
      expect(sendParamsReceived.ContentLength).toBe(500 * 1024 * 1024);

      // Temp file cleaned up
      expect(fs.existsSync(tempFilePath)).toBe(false);
    });
  });
});
