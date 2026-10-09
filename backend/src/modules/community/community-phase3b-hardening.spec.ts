import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';
import { CommunityMediaJobService } from './services/community-media-job.service';
import { PostService } from './services/post.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../../common/aws/s3.service';
import { getModelToken } from '@nestjs/mongoose';
import { CommunityMediaJob } from './schemas/media-job.schema';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase 3B — Production Hardening & Video Processing Audit Suite', () => {
  let videoProcessor: CommunityVideoProcessorService;
  const tempFilesToClean: string[] = [];

  const createTempPath = (prefix: string, ext: string) => {
    const p = path.join(
      os.tmpdir(),
      `p3b_audit_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
    );
    tempFilesToClean.push(p);
    return p;
  };

  beforeAll(() => {
    videoProcessor = new CommunityVideoProcessorService();
  });

  afterAll(() => {
    for (const file of tempFilesToClean) {
      if (fs.existsSync(file)) {
        try {
          fs.rmSync(file, { recursive: true, force: true });
        } catch {}
      }
    }
  });

  // =========================================================================
  // 1. TRIM CORRECTNESS & AUDIO SYNC (Sections 17 & 18)
  // =========================================================================
  describe('1. Trim Correctness & Audio Sync', () => {
    let source10s: string;

    beforeAll(() => {
      // Create a deterministic 10s video with 440Hz sine wave audio
      source10s = createTempPath('source_10s', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=10:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=10 -c:v libx264 -c:a aac -shortest ${source10s}`,
      );
    });

    it('trims 2s to 7s accurately (~5.0s) and maintains audio sync', async () => {
      const out = createTempPath('trim_2_7', '.mp4');
      const poster = createTempPath('poster_2_7', '.jpg');

      const res = await videoProcessor.processVideo(source10s, out, poster, {
        trimStart: 2,
        trimEnd: 7,
      });

      expect(Math.abs(res.duration - 5.0)).toBeLessThan(0.3);

      // Verify audio and video streams with ffprobe
      const probeJson = execSync(
        `ffprobe -v error -show_entries stream=codec_type,codec_name,duration -of json ${out}`,
      ).toString();
      const streams = JSON.parse(probeJson).streams;

      const vStream = streams.find((s: any) => s.codec_type === 'video');
      const aStream = streams.find((s: any) => s.codec_type === 'audio');

      expect(vStream).toBeDefined();
      expect(aStream).toBeDefined();
      expect(Math.abs(parseFloat(vStream.duration) - 5.0)).toBeLessThan(0.3);
      expect(Math.abs(parseFloat(aStream.duration) - 5.0)).toBeLessThan(0.3);
      // Audio-video duration delta must be within 100ms
      expect(
        Math.abs(parseFloat(vStream.duration) - parseFloat(aStream.duration)),
      ).toBeLessThan(0.1);
    });

    it('trims 0s to 5s correctly', async () => {
      const out = createTempPath('trim_0_5', '.mp4');
      const poster = createTempPath('poster_0_5', '.jpg');
      const res = await videoProcessor.processVideo(source10s, out, poster, {
        trimStart: 0,
        trimEnd: 5,
      });
      expect(Math.abs(res.duration - 5.0)).toBeLessThan(0.3);
    });

    it('trims 5s to 10s correctly', async () => {
      const out = createTempPath('trim_5_10', '.mp4');
      const poster = createTempPath('poster_5_10', '.jpg');
      const res = await videoProcessor.processVideo(source10s, out, poster, {
        trimStart: 5,
        trimEnd: 10,
      });
      expect(Math.abs(res.duration - 5.0)).toBeLessThan(0.3);
    });

    it('clamps negative trimStart to 0 without throwing', async () => {
      const out = createTempPath('trim_neg', '.mp4');
      const poster = createTempPath('poster_neg', '.jpg');
      const res = await videoProcessor.processVideo(source10s, out, poster, {
        trimStart: -3,
        trimEnd: 4,
      });
      expect(Math.abs(res.duration - 4.0)).toBeLessThan(0.3);
    });

    it('rejects trimEnd <= trimStart with BadRequestException', async () => {
      const out = createTempPath('trim_invalid', '.mp4');
      const poster = createTempPath('poster_invalid', '.jpg');
      await expect(
        videoProcessor.processVideo(source10s, out, poster, {
          trimStart: 6,
          trimEnd: 3,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 2. ASPECT RATIOS & RESOLUTION POLICIES (Sections 19, 20, 21, 22, 23)
  // =========================================================================
  describe('2. Aspect Ratio & Resolution Policies', () => {
    it('Portrait 720x1280: preserves aspect ratio, bounds <= 1080x1920, even dimensions', async () => {
      const src = createTempPath('src_port_720', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=0.5:size=720x1280:rate=30 -c:v libx264 ${src}`,
      );
      const out = createTempPath('out_port_720', '.mp4');
      const poster = createTempPath('post_port_720', '.jpg');

      const res = await videoProcessor.processVideo(src, out, poster);
      expect(res.width).toBe(720);
      expect(res.height).toBe(1280);
      expect(res.width % 2).toBe(0);
      expect(res.height % 2).toBe(0);
    });

    it('Landscape 1920x1080: preserves 16:9, no forced portrait crop, no upscaling', async () => {
      const src = createTempPath('src_land_1080', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=0.5:size=1920x1080:rate=30 -c:v libx264 ${src}`,
      );
      const out = createTempPath('out_land_1080', '.mp4');
      const poster = createTempPath('post_land_1080', '.jpg');

      const res = await videoProcessor.processVideo(src, out, poster);
      expect(res.width).toBe(1920);
      expect(res.height).toBe(1080);
      expect(res.width % 2).toBe(0);
      expect(res.height % 2).toBe(0);
    });

    it('Square 1080x1080: remains 1:1 square, no distortion', async () => {
      const src = createTempPath('src_sq_1080', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=0.5:size=1080x1080:rate=30 -c:v libx264 ${src}`,
      );
      const out = createTempPath('out_sq_1080', '.mp4');
      const poster = createTempPath('post_sq_1080', '.jpg');

      const res = await videoProcessor.processVideo(src, out, poster);
      expect(res.width).toBe(1080);
      expect(res.height).toBe(1080);
    });

    it('Small 360x640: does NOT upscale to 1080x1920', async () => {
      const src = createTempPath('src_small_360', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=0.5:size=360x640:rate=30 -c:v libx264 ${src}`,
      );
      const out = createTempPath('out_small_360', '.mp4');
      const poster = createTempPath('post_small_360', '.jpg');

      const res = await videoProcessor.processVideo(src, out, poster);
      expect(res.width).toBe(360);
      expect(res.height).toBe(640);
    });

    it('High-Res 4K Portrait 2160x3840: downscales and bounds to 1080x1920', async () => {
      const src = createTempPath('src_4k_port', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=0.5:size=2160x3840:rate=30 -c:v libx264 ${src}`,
      );
      const out = createTempPath('out_4k_port', '.mp4');
      const poster = createTempPath('post_4k_port', '.jpg');

      const res = await videoProcessor.processVideo(src, out, poster);
      expect(res.width).toBe(1080);
      expect(res.height).toBe(1920);
    }, 20000);
  });

  // =========================================================================
  // 3. ROTATED VIDEO & AUDIO/NO-AUDIO & POSTER (Sections 24, 25, 26, 27, 29)
  // =========================================================================
  describe('3. Rotated Media, Audio Profiles & Posters', () => {
    it('Rotated video with display matrix 90 deg: probe and output are upright 9:16 portrait', async () => {
      const baseSrc = createTempPath('base_land', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=0.5:size=1920x1080:rate=30 -c:v libx264 ${baseSrc}`,
      );

      const src = createTempPath('src_rot90', '.mp4');
      execSync(
        `ffmpeg -y -v error -display_rotation:v:0 90 -i ${baseSrc} -c copy ${src}`,
      );

      const probe = await videoProcessor.probeMedia(src);
      expect(probe.rotation).toBe(90);
      expect(probe.width).toBe(1080);
      expect(probe.height).toBe(1920);

      const out = createTempPath('out_rot90', '.mp4');
      const poster = createTempPath('post_rot90', '.jpg');
      const res = await videoProcessor.processVideo(src, out, poster);

      expect(res.width).toBe(1080);
      expect(res.height).toBe(1920);
    });

    it('No-audio video: succeeds with -an, output valid with zero audio streams', async () => {
      const src = createTempPath('src_no_audio', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=1:size=640x360:rate=30 -an -c:v libx264 ${src}`,
      );

      const out = createTempPath('out_no_audio', '.mp4');
      const poster = createTempPath('post_no_audio', '.jpg');

      const res = await videoProcessor.processVideo(src, out, poster);
      expect(res.duration).toBeGreaterThan(0.5);

      const probeJson = execSync(
        `ffprobe -v error -show_entries stream=codec_type -of json ${out}`,
      ).toString();
      const streams = JSON.parse(probeJson).streams;
      const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
      expect(audioStreams.length).toBe(0);
    });

    it('Poster generation: creates non-zero JPEG image from processed video', async () => {
      const src = createTempPath('src_poster_test', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=2:size=640x360:rate=30 -c:v libx264 ${src}`,
      );
      const poster = createTempPath('poster_test_out', '.jpg');

      const ok = await videoProcessor.generatePosterFromVideo(src, poster, 0.5);
      expect(ok).toBe(true);
      expect(fs.existsSync(poster)).toBe(true);
      const stat = fs.statSync(poster);
      expect(stat.size).toBeGreaterThan(100);

      // Verify JPEG magic bytes FF D8 FF
      const fd = fs.openSync(poster, 'r');
      const buf = Buffer.alloc(3);
      fs.readSync(fd, buf, 0, 3, 0);
      fs.closeSync(fd);
      expect(buf[0]).toBe(0xff);
      expect(buf[1]).toBe(0xd8);
      expect(buf[2]).toBe(0xff);
    });
  });

  // =========================================================================
  // 4. PUBLISHING RACE CONDITION ENFORCEMENT (Section 34 & 38)
  // =========================================================================
  describe('4. Publishing Race Condition Server-Side Enforcement', () => {
    let postService: PostService;
    let mockJobService: any;
    let mockPostRepo: any;

    beforeEach(async () => {
      mockJobService = {
        getJobByMediaId: jest.fn(),
      };
      mockPostRepo = {
        create: jest
          .fn()
          .mockImplementation((data) =>
            Promise.resolve({ _id: 'post-123', ...data }),
          ),
        createMedia: jest.fn().mockResolvedValue([]),
        findByIdPopulated: jest
          .fn()
          .mockImplementation((id) => Promise.resolve({ _id: id, media: [] })),
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
            useValue: { sendNotification: jest.fn() },
          },
          { provide: CommunityMediaJobService, useValue: mockJobService },
        ],
      }).compile();

      postService = module.get<PostService>(PostService);
    });

    it('rejects publishing if video job is still PROCESSING', async () => {
      mockJobService.getJobByMediaId.mockResolvedValue({
        mediaId: 'media-pending-1',
        userId: 'user-alice',
        status: 'PROCESSING',
      });

      await expect(
        postService.createPost('user-alice', {
          content: 'Sneaky publish',
          type: 'VIDEO',
          media: [
            {
              url: 'https://bucket.s3.amazonaws.com/orig.mp4',
              type: 'video',
              mediaId: 'media-pending-1',
            },
          ],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects publishing if video job is QUEUED', async () => {
      mockJobService.getJobByMediaId.mockResolvedValue({
        mediaId: 'media-queued-1',
        userId: 'user-alice',
        status: 'QUEUED',
      });

      await expect(
        postService.createPost('user-alice', {
          content: 'Premature publish',
          type: 'VIDEO',
          media: [
            {
              url: 'https://bucket.s3.amazonaws.com/orig.mp4',
              type: 'video',
              mediaId: 'media-queued-1',
            },
          ],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects publishing if video job FAILED', async () => {
      mockJobService.getJobByMediaId.mockResolvedValue({
        mediaId: 'media-failed-1',
        userId: 'user-alice',
        status: 'FAILED',
        errorMessage: 'FFmpeg transcode timeout',
      });

      await expect(
        postService.createPost('user-alice', {
          content: 'Failed media publish',
          type: 'VIDEO',
          media: [
            {
              url: 'https://bucket.s3.amazonaws.com/orig.mp4',
              type: 'video',
              mediaId: 'media-failed-1',
            },
          ],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects publishing if video belongs to another user (IDOR)', async () => {
      mockJobService.getJobByMediaId.mockResolvedValue({
        mediaId: 'media-bob-1',
        userId: 'user-bob',
        status: 'READY',
        outputUrl: 'https://bucket.s3.amazonaws.com/bob_processed.mp4',
      });

      await expect(
        postService.createPost('user-alice', {
          content: 'Stolen media publish',
          type: 'VIDEO',
          media: [
            {
              url: 'https://bucket.s3.amazonaws.com/orig.mp4',
              type: 'video',
              mediaId: 'media-bob-1',
            },
          ],
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows publishing and binds processedUrl when video is READY', async () => {
      mockJobService.getJobByMediaId.mockResolvedValue({
        mediaId: 'media-ready-1',
        userId: 'user-alice',
        status: 'READY',
        outputUrl: 'https://bucket.s3.amazonaws.com/processed_canonical.mp4',
        posterUrl: 'https://bucket.s3.amazonaws.com/poster_canonical.jpg',
        outputDuration: 8.5,
        outputWidth: 1080,
        outputHeight: 1920,
      });

      await postService.createPost('user-alice', {
        content: 'Ready Reel',
        type: 'VIDEO',
        media: [
          {
            url: 'https://bucket.s3.amazonaws.com/temp.mp4',
            type: 'video',
            mediaId: 'media-ready-1',
          },
        ],
      } as any);

      expect(mockPostRepo.createMedia).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            processedUrl:
              'https://bucket.s3.amazonaws.com/processed_canonical.mp4',
            posterUrl: 'https://bucket.s3.amazonaws.com/poster_canonical.jpg',
            duration: 8.5,
            width: 1080,
            height: 1920,
          }),
        ]),
      );
    });

    it('Legacy video regression: allows video post without mediaId to publish normally', async () => {
      await postService.createPost('user-alice', {
        content: 'Old Reel from 2024',
        type: 'VIDEO',
        media: [
          {
            url: 'https://bucket.s3.amazonaws.com/legacy_video.mp4',
            type: 'video',
          },
        ],
      } as any);

      expect(mockPostRepo.create).toHaveBeenCalled();
      expect(mockPostRepo.createMedia).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            url: 'https://bucket.s3.amazonaws.com/legacy_video.mp4',
            type: 'video',
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // 5. RAPID RETRY IDEMPOTENCY (Section 33)
  // =========================================================================
  describe('5. Rapid Retry Idempotency', () => {
    it('returns existing job without duplicate reset when retried while already QUEUED or PROCESSING', async () => {
      const mockJob = {
        _id: 'job-already-processing',
        mediaId: 'media-123',
        userId: 'user-1',
        status: 'PROCESSING',
        attempts: 1,
        save: jest.fn(),
      };

      const mockModel: any = {
        findOne: jest.fn().mockResolvedValue(mockJob),
        create: jest.fn(),
        updateOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
      };

      const jobService = new CommunityMediaJobService(
        mockModel,
        {} as any,
        {} as any,
      );

      const res = await jobService.retryJob('media-123', 'user-1', false);

      expect(res.status).toBe('PROCESSING');
      // Must not reset attempts or save again
      expect(mockJob.save).not.toHaveBeenCalled();
    });
  });
});
