/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';
import { CommunityMediaJobService } from './services/community-media-job.service';
import { CommunityMediaController } from './controllers/community-media.controller';
import { CommunityMediaJob } from './schemas/media-job.schema';
import { S3Service } from '../../common/aws/s3.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';

describe('Community Video Processing & Transcoding Pipeline (Phase 3B)', () => {
  let videoProcessor: CommunityVideoProcessorService;
  let jobService: CommunityMediaJobService;
  let mediaController: CommunityMediaController;

  const mockS3Client = {
    send: jest.fn(),
  };

  const mockS3Service = {
    s3Client: mockS3Client,
    bucketName: 'test-community-bucket',
    region: 'us-east-1',
  };

  const mockSignedUrlService = {
    generateSignedImageUrl: jest
      .fn()
      .mockImplementation((key) =>
        Promise.resolve(`https://signed-cdn.com/${key}`),
      ),
    generateSignedVideoUrl: jest
      .fn()
      .mockImplementation((key) =>
        Promise.resolve(`https://signed-cdn.com/${key}`),
      ),
  };

  // Mock Mongoose model for CommunityMediaJob
  const mockJobDoc = (data: any) => ({
    ...data,
    _id: data._id || 'job-uuid-123',
    save: jest.fn().mockResolvedValue(this),
  });

  const mockJobModel: any = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default mock implementation that safely consumes read streams
    mockS3Client.send.mockImplementation(async (command: any) => {
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunityMediaController],
      providers: [
        CommunityVideoProcessorService,
        CommunityMediaJobService,
        {
          provide: getModelToken(CommunityMediaJob.name),
          useValue: mockJobModel,
        },
        { provide: S3Service, useValue: mockS3Service },
        { provide: SignedUrlService, useValue: mockSignedUrlService },
      ],
    }).compile();

    videoProcessor = module.get<CommunityVideoProcessorService>(
      CommunityVideoProcessorService,
    );
    jobService = module.get<CommunityMediaJobService>(CommunityMediaJobService);
    mediaController = module.get<CommunityMediaController>(
      CommunityMediaController,
    );
  });

  describe('1. Video Processor — Validation & FFprobe Invariants', () => {
    it('rejects empty or nonexistent video files', async () => {
      const nonExistent = path.join(
        os.tmpdir(),
        `non-existent-${Date.now()}.mp4`,
      );
      await expect(videoProcessor.probeMedia(nonExistent)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects empty 0-byte video files', async () => {
      const emptyFile = path.join(os.tmpdir(), `empty-${Date.now()}.mp4`);
      fs.writeFileSync(emptyFile, Buffer.alloc(0));

      try {
        await expect(videoProcessor.probeMedia(emptyFile)).rejects.toThrow(
          BadRequestException,
        );
      } finally {
        if (fs.existsSync(emptyFile)) fs.unlinkSync(emptyFile);
      }
    });

    it('validates trim parameters: trimEnd must be greater than trimStart', async () => {
      const testFile = path.join(os.tmpdir(), `probe-trim-${Date.now()}.mp4`);
      fs.writeFileSync(testFile, Buffer.from('mock video bytes'));

      jest.spyOn(videoProcessor, 'probeMedia').mockResolvedValue({
        duration: 30,
        width: 1080,
        height: 1920,
        videoCodec: 'h264',
        hasAudio: true,
        formatName: 'mov,mp4',
        size: 5000,
      });

      await expect(
        videoProcessor.processVideo(testFile, 'out.mp4', 'poster.jpg', {
          trimStart: 10,
          trimEnd: 5,
        }),
      ).rejects.toThrow(BadRequestException);

      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });

    it('validates trim parameters: trim duration must be >= 0.5s and <= 90s', async () => {
      const testFile = path.join(
        os.tmpdir(),
        `probe-trim-short-${Date.now()}.mp4`,
      );
      fs.writeFileSync(testFile, Buffer.from('mock video bytes'));

      jest.spyOn(videoProcessor, 'probeMedia').mockResolvedValue({
        duration: 30,
        width: 1080,
        height: 1920,
        videoCodec: 'h264',
        hasAudio: false,
        formatName: 'mov,mp4',
        size: 5000,
      });

      // Too short (< 0.5s)
      await expect(
        videoProcessor.processVideo(testFile, 'out.mp4', 'poster.jpg', {
          trimStart: 1.0,
          trimEnd: 1.2,
        }),
      ).rejects.toThrow(BadRequestException);

      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });

    it('enforces maximum duration rule: rejects video with duration > 90s', async () => {
      const testFile = path.join(os.tmpdir(), `probe-long-${Date.now()}.mp4`);
      fs.writeFileSync(testFile, Buffer.from('mock video bytes'));

      jest.spyOn(videoProcessor, 'probeMedia').mockResolvedValue({
        duration: 95,
        width: 1080,
        height: 1920,
        videoCodec: 'h264',
        hasAudio: true,
        formatName: 'mov,mp4',
        size: 5000,
      });

      await expect(
        videoProcessor.processVideo(testFile, 'out.mp4', 'poster.jpg', {
          trimStart: 0,
          trimEnd: 95,
        }),
      ).rejects.toThrow(BadRequestException);

      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });
  });

  describe('2. Job Lifecycle & Atomic Worker Claiming', () => {
    it('creates a media job in QUEUED status with proper metadata', async () => {
      mockJobModel.create.mockImplementation((dto) =>
        Promise.resolve(mockJobDoc(dto)),
      );

      const job = await jobService.createJob({
        userId: 'user-creator-1',
        sourceKey: 'community/originals/user-creator-1/reel-123.mp4',
        sourceUrl:
          'https://test-community-bucket.s3.amazonaws.com/community/originals/user-creator-1/reel-123.mp4',
        mimeType: 'video/mp4',
        sourceSize: 10 * 1024 * 1024,
        sourceDuration: 25,
        trimStart: 2.5,
        trimEnd: 15.0,
      });

      expect(mockJobModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-creator-1',
          status: 'QUEUED',
          attempts: 0,
          maxAttempts: 3,
          trimStart: 2.5,
          trimEnd: 15.0,
        }),
      );
      expect(job.status).toBe('QUEUED');
      expect(job.mediaId).toBeDefined();
    });

    it('claims queued jobs atomically preventing concurrent duplicate processing', async () => {
      const queuedJob = mockJobDoc({
        _id: 'job-claim-1',
        mediaId: 'media-claim-1',
        userId: 'user-1',
        status: 'PROCESSING',
        attempts: 1,
        sourceKey: 'community/originals/user-1/vid.mp4',
      });

      mockJobModel.findOneAndUpdate
        .mockResolvedValueOnce(queuedJob) // First worker claims job
        .mockResolvedValueOnce(null); // Second worker gets null (no duplicate claim)

      // Spy on executeJob to avoid real disk S3 network operations in concurrency test
      const executeSpy = jest
        .spyOn<any, any>(jobService, 'executeJob')
        .mockResolvedValue(undefined);

      await jobService.processNextJobs();

      expect(mockJobModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'QUEUED',
          attempts: { $lt: 3 },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'PROCESSING' }),
          $inc: { attempts: 1 },
        }),
        expect.any(Object),
      );
      expect(executeSpy).toHaveBeenCalledWith(queuedJob);
    });

    it('recovers stale jobs stuck in PROCESSING longer than threshold', async () => {
      mockJobModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await jobService.recoverStaleJobs();

      expect(mockJobModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PROCESSING',
          lockedAt: expect.any(Object),
          attempts: { $lt: 3 },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'QUEUED' }),
        }),
      );
    });
  });

  describe('3. Execution & S3 Streaming without Buffer Exhaustion', () => {
    it('streams source from S3 to disk and uploads processed output and poster', async () => {
      const fakeJob = mockJobDoc({
        _id: 'exec-job-1',
        mediaId: 'media-exec-1',
        userId: 'user-exec-1',
        sourceKey: 'community/originals/user-exec-1/source.mp4',
        trimStart: 1.0,
        trimEnd: 10.0,
        attempts: 1,
        maxAttempts: 3,
      });

      mockS3Client.send.mockImplementation(async (command) => {
        if (command.constructor.name === 'GetObjectCommand') {
          const stream = new Readable();
          stream.push('fake video content for streaming');
          stream.push(null);
          return { Body: stream };
        }
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

      // Mock videoProcessor.processVideo
      jest
        .spyOn(videoProcessor, 'processVideo')
        .mockImplementation(async (src, out, poster) => {
          fs.writeFileSync(out, 'processed-mp4-data');
          fs.writeFileSync(poster, 'poster-jpg-data');
          return {
            outputPath: out,
            posterPath: poster,
            duration: 9.0,
            width: 720,
            height: 1280,
            size: 1024,
          };
        });

      mockJobModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await (jobService as any).executeJob(fakeJob);

      // Verify PutObjectCommand was called for processed mp4 and poster
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-community-bucket',
            Key: 'community/processed/user-exec-1/media-exec-1.mp4',
            ContentType: 'video/mp4',
          }),
        }),
      );

      // Verify Job updated to READY
      expect(mockJobModel.updateOne).toHaveBeenCalledWith(
        { _id: 'exec-job-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'READY',
            outputKey: 'community/processed/user-exec-1/media-exec-1.mp4',
            outputDuration: 9.0,
            outputWidth: 720,
            outputHeight: 1280,
          }),
        }),
      );
    });

    it('distinguishes permanent validation errors from transient errors', async () => {
      const fakeJob = mockJobDoc({
        _id: 'fail-job-1',
        mediaId: 'media-fail-1',
        userId: 'user-fail-1',
        sourceKey: 'community/originals/user-fail-1/corrupt.mp4',
        attempts: 1,
        maxAttempts: 3,
      });

      mockS3Client.send.mockImplementation(async (command) => {
        if (command.constructor.name === 'GetObjectCommand') {
          const stream = new Readable();
          stream.push('corrupt content');
          stream.push(null);
          return { Body: stream };
        }
        return {};
      });

      // Force a permanent error in processVideo (e.g. video >90s or no video stream)
      jest.spyOn(videoProcessor, 'processVideo').mockRejectedValue(
        new BadRequestException({
          code: 'VIDEO_TOO_LONG',
          message: 'Video exceeds 90s',
        }),
      );

      await (jobService as any).executeJob(fakeJob);

      expect(mockJobModel.updateOne).toHaveBeenCalledWith(
        { _id: 'fail-job-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'FAILED',
            errorCode: 'PERMANENT_MEDIA_ERROR',
            isPermanentFailure: true,
          }),
        }),
      );
    });
  });

  describe('4. Security & Access Control on Status and Retry Endpoints', () => {
    it('allows owner to query processing status', async () => {
      const job = mockJobDoc({
        _id: 'status-job-1',
        mediaId: 'media-xyz',
        userId: 'user-owner',
        status: 'READY',
        outputUrl: 'https://cdn.com/reel.mp4',
        posterUrl: 'https://cdn.com/poster.jpg',
        outputDuration: 12.5,
        outputWidth: 720,
        outputHeight: 1280,
      });

      mockJobModel.findOne.mockResolvedValue(job);

      const res = await mediaController.getMediaStatus('media-xyz', {
        user: { userId: 'user-owner', role: 'student' },
      });

      expect(res.status).toBe('READY');
      expect(res.playbackUrl).toBe('https://cdn.com/reel.mp4');
      expect(res.duration).toBe(12.5);
      expect(res.progress).toBeNull(); // No faked percentage
    });

    it('denies access to non-owner user attempting IDOR status probe', async () => {
      const job = mockJobDoc({
        _id: 'status-job-1',
        mediaId: 'media-xyz',
        userId: 'user-owner',
        status: 'PROCESSING',
      });

      mockJobModel.findOne.mockResolvedValue(job);

      await expect(
        mediaController.getMediaStatus('media-xyz', {
          user: { userId: 'attacker-user', role: 'student' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows retry for transiently failed job and re-queues worker', async () => {
      const failedJob = mockJobDoc({
        _id: 'job-failed-1',
        mediaId: 'media-retryable',
        userId: 'user-owner',
        status: 'FAILED',
        isPermanentFailure: false,
        attempts: 3,
        save: jest.fn().mockResolvedValue(this),
      });

      mockJobModel.findOne.mockResolvedValue(failedJob);

      const res = await mediaController.retryMediaProcessing(
        'media-retryable',
        {
          user: { userId: 'user-owner', role: 'student' },
        },
      );

      expect(failedJob.status).toBe('QUEUED');
      expect(failedJob.attempts).toBe(0);
      expect(res.status).toBe('QUEUED');
      expect(res.message).toContain('retry initiated');
    });

    it('rejects retry if failure was permanent (invalid/corrupted video)', async () => {
      const permanentFailedJob = mockJobDoc({
        _id: 'job-perm-1',
        mediaId: 'media-corrupt',
        userId: 'user-owner',
        status: 'FAILED',
        isPermanentFailure: true,
        errorMessage:
          'The uploaded file does not contain a valid video stream.',
      });

      mockJobModel.findOne.mockResolvedValue(permanentFailedJob);

      await expect(
        mediaController.retryMediaProcessing('media-corrupt', {
          user: { userId: 'user-owner', role: 'student' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
