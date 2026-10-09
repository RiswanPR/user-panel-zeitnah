import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommunityMusicService } from './services/community-music.service';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';
import { CommunityMediaJobService } from './services/community-media-job.service';
import { PostService } from './services/post.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase 3C — Audio & Music Foundation Test Suite', () => {
  let musicService: CommunityMusicService;
  let videoProcessor: CommunityVideoProcessorService;
  let mediaJobService: CommunityMediaJobService;
  let postService: PostService;

  const tempFilesToClean: string[] = [];

  const createTempPath = (prefix: string, ext: string) => {
    const p = path.join(
      os.tmpdir(),
      `p3c_test_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
    );
    tempFilesToClean.push(p);
    return p;
  };

  // Mock In-Memory Music Store
  let inMemoryTracks: any[] = [];

  const mockMusicModel: any = {
    find: (filter: any) => ({
      sort: () => ({
        skip: (skipCount: number) => ({
          limit: (limitCount: number) => ({
            exec: async () => {
              let res = inMemoryTracks.filter((t) => {
                if (
                  filter.isActive !== undefined &&
                  t.isActive !== filter.isActive
                )
                  return false;
                if (filter.category && t.category !== filter.category)
                  return false;
                if (filter.$or) {
                  const match = filter.$or.some((cond: any) => {
                    if (cond.title && cond.title.$regex)
                      return cond.title.$regex.test(t.title);
                    if (cond.artist && cond.artist.$regex)
                      return cond.artist.$regex.test(t.artist);
                    if (cond.album && cond.album.$regex)
                      return cond.album.$regex.test(t.album || '');
                    if (cond.tags && cond.tags.$in)
                      return t.tags?.some((tag: string) =>
                        cond.tags.$in[0].test(tag),
                      );
                    return false;
                  });
                  if (!match) return false;
                }
                return true;
              });
              if (skipCount) res = res.slice(skipCount);
              return res.slice(0, limitCount);
            },
          }),
        }),
        limit: (limitCount: number) => ({
          exec: async () => {
            return inMemoryTracks
              .filter((t) => {
                if (
                  filter.isActive !== undefined &&
                  t.isActive !== filter.isActive
                )
                  return false;
                if (filter.category && t.category !== filter.category)
                  return false;
                if (filter.$or) {
                  return filter.$or.some((cond: any) => {
                    if (cond.title && cond.title.$regex)
                      return cond.title.$regex.test(t.title);
                    if (cond.artist && cond.artist.$regex)
                      return cond.artist.$regex.test(t.artist);
                    if (cond.album && cond.album.$regex)
                      return cond.album.$regex.test(t.album || '');
                    if (cond.tags && cond.tags.$in)
                      return t.tags?.some((tag: string) =>
                        cond.tags.$in[0].test(tag),
                      );
                    return false;
                  });
                }
                return true;
              })
              .slice(0, limitCount);
          },
        }),
      }),
    }),
    countDocuments: (filter: any) => ({
      exec: async () => {
        return inMemoryTracks.filter((t) => {
          if (filter.isActive !== undefined && t.isActive !== filter.isActive)
            return false;
          if (filter.category && t.category !== filter.category) return false;
          return true;
        }).length;
      },
    }),
    findById: (id: string) => ({
      exec: async () => inMemoryTracks.find((t) => t._id === id) || null,
    }),
    findOne: (query: any) => ({
      exec: async () => {
        return (
          inMemoryTracks.find((t) => {
            if (query._id && t._id !== query._id) return false;
            if (query.isActive !== undefined && t.isActive !== query.isActive)
              return false;
            return true;
          }) || null
        );
      },
    }),
    insertMany: async (items: any[]) => {
      inMemoryTracks.push(...items);
      return items;
    },
  };

  // Mock Media Job Model
  const inMemoryJobs: any[] = [];
  const mockJobModel: any = {
    create: async (data: any) => {
      const doc = { ...data, _id: `job-${Date.now()}`, createdAt: new Date() };
      inMemoryJobs.push(doc);
      return doc;
    },
    findOne: async (query: any) => {
      return inMemoryJobs.find((j) => j.mediaId === query.mediaId) || null;
    },
    findOneAndUpdate: async (query: any, update: any) => {
      const job = inMemoryJobs.find((j) => j.status === 'QUEUED');
      if (job) {
        Object.assign(job, update.$set);
        if (update.$inc?.attempts) job.attempts += update.$inc.attempts;
        return job;
      }
      return null;
    },
    updateOne: async (query: any, update: any) => {
      const job = inMemoryJobs.find((j) => j._id === query._id);
      if (job && update.$set) {
        Object.assign(job, update.$set);
      }
      return { modifiedCount: 1 };
    },
    countDocuments: async () => 0,
  };

  // Mock Post Repository
  const createdPostsStore: any[] = [];
  const createdMediaStore: any[] = [];
  const mockPostRepository: any = {
    create: async (data: any) => {
      const doc = {
        _id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...data,
        stats: { likes: 0, comments: 0 },
        createdAt: new Date(),
      };
      createdPostsStore.push(doc);
      return doc;
    },
    createMedia: async (items: any[]) => {
      createdMediaStore.push(...items);
      return items;
    },
    findById: async (id: string) =>
      createdPostsStore.find((p) => p._id === id) || null,
    findByIdPopulated: async (id: string) => {
      const p = createdPostsStore.find((post) => post._id === id);
      if (!p) return null;
      const media = createdMediaStore.filter((m) => m.postId === id);
      return { ...p, media };
    },
  };

  beforeAll(async () => {
    // Populate seed tracks
    inMemoryTracks = [
      {
        _id: 'track-active-1',
        title: 'Cinematic Dawn',
        artist: 'Zeitnah Music',
        album: 'Acoustics Vol 1',
        duration: 60,
        category: 'UPBEAT',
        mood: 'Energetic',
        tags: ['modern', 'electronic'],
        audioKey: 'community/music/track-1/audio.mp3',
        audioUrl: 'https://cdn.zeitnah.app/music/track-1.mp3',
        coverUrl: 'https://cdn.zeitnah.app/music/track-1.jpg',
        licenseType: 'ROYALTY_FREE',
        attributionRequired: false,
        isActive: true,
        createdAt: new Date('2026-10-01'),
      },
      {
        _id: 'track-active-2',
        title: 'Acoustic Horizon',
        artist: 'Aurora Sound',
        album: 'Acoustics Vol 1',
        duration: 90,
        category: 'CHILL',
        mood: 'Relaxed',
        tags: ['acoustic', 'peaceful'],
        audioKey: 'community/music/track-2/audio.mp3',
        audioUrl: 'https://cdn.zeitnah.app/music/track-2.mp3',
        licenseType: 'ROYALTY_FREE',
        attributionRequired: true,
        attributionText: 'Acoustic Horizon by Aurora Sound',
        isActive: true,
        createdAt: new Date('2026-10-02'),
      },
      {
        _id: 'track-inactive-3',
        title: 'Disabled Anthem',
        artist: 'Old Artist',
        duration: 45,
        category: 'UPBEAT',
        audioKey: 'community/music/track-3/audio.mp3',
        audioUrl: 'https://cdn.zeitnah.app/music/track-3.mp3',
        isActive: false, // Inactive track
        createdAt: new Date('2026-09-01'),
      },
    ];

    musicService = new CommunityMusicService(mockMusicModel);
    videoProcessor = new CommunityVideoProcessorService();

    const mockS3Service: any = {
      bucketName: 'test-bucket',
      region: 'eu-central-1',
      s3Client: { send: async () => ({ Body: null }) },
    };

    mediaJobService = new CommunityMediaJobService(
      mockJobModel,
      videoProcessor,
      mockS3Service,
      undefined,
      musicService,
    );
    jest.spyOn(mediaJobService, 'triggerWorker').mockImplementation(() => {});

    postService = new PostService(
      mockPostRepository,
      { emitToFeed: () => {}, emitPostCreated: () => {} } as any,
      { createNotification: async () => {} } as any,
      undefined,
      undefined,
      undefined,
      mediaJobService,
      musicService,
    );
  });

  afterAll(() => {
    for (const f of tempFilesToClean) {
      if (fs.existsSync(f)) {
        try {
          fs.rmSync(f, { recursive: true, force: true });
        } catch {}
      }
    }
  });

  // =========================================================================
  // 1. MUSIC CATALOG & SEARCH TESTS (Items 1, 2, 3, 4)
  // =========================================================================
  describe('1. Music Catalog Retrieval & Search', () => {
    it('1. retrieves paginated active music catalog', async () => {
      const res = await musicService.getCatalog({ limit: 10 });
      expect(res.items.length).toBe(2);
      expect(res.total).toBe(2);
      expect(res.items.every((t) => t.isActive)).toBe(true);
    });

    it('2. filters catalog by category', async () => {
      const res = await musicService.getCatalog({ category: 'CHILL' });
      expect(res.items.length).toBe(1);
      expect(res.items[0].title).toBe('Acoustic Horizon');
    });

    it('3. searches active tracks by title or artist with sanitization', async () => {
      const res = await musicService.searchMusic({ q: 'Cinematic' });
      expect(res.items.length).toBe(1);
      expect(res.items[0].title).toBe('Cinematic Dawn');
    });

    it('4. strictly excludes inactive tracks from catalog, search, and direct lookup', async () => {
      const catalog = await musicService.getCatalog({});
      expect(catalog.items.some((t) => t._id === 'track-inactive-3')).toBe(
        false,
      );

      const search = await musicService.searchMusic({ q: 'Disabled' });
      expect(search.items.length).toBe(0);

      await expect(
        musicService.getTrackById('track-inactive-3'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // 2. SERVER-SIDE AUDIO CONFIG VALIDATION (Items 5, 6, 7, 8, 9, 10, 11, 12)
  // =========================================================================
  describe('2. Server-Side Audio Config Validation', () => {
    it('5. throws BadRequestException when musicId is missing in MUSIC_ONLY or MIXED mode', async () => {
      await expect(
        musicService.validateAndResolveAudioConfig({ audioMode: 'MUSIC_ONLY' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        musicService.validateAndResolveAudioConfig({ audioMode: 'MIXED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. throws NotFoundException when musicId does not exist or is inactive', async () => {
      await expect(
        musicService.validateAndResolveAudioConfig({
          audioMode: 'MUSIC_ONLY',
          musicId: 'non-existent-track',
        }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        musicService.validateAndResolveAudioConfig({
          audioMode: 'MUSIC_ONLY',
          musicId: 'track-inactive-3',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('7. validates timing: sourceStart >= 0 and sourceEnd > sourceStart', async () => {
      await expect(
        musicService.validateAndResolveAudioConfig({
          audioMode: 'MUSIC_ONLY',
          musicId: 'track-active-1',
          sourceStart: 30,
          sourceEnd: 20, // Invalid: end before start
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. clamps sourceEnd to track duration if sourceEnd exceeds duration', async () => {
      const resolved = await musicService.validateAndResolveAudioConfig({
        audioMode: 'MUSIC_ONLY',
        musicId: 'track-active-1', // Duration 60s
        sourceStart: 10,
        sourceEnd: 120, // Exceeds duration
      });
      expect(resolved?.sourceEnd).toBe(60);
    });

    it('9. rejects invalid volume bounds (< 0.0 or > 1.0)', async () => {
      await expect(
        musicService.validateAndResolveAudioConfig({
          audioMode: 'ORIGINAL_ONLY',
          originalVolume: 1.5,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        musicService.validateAndResolveAudioConfig({
          audioMode: 'MUSIC_ONLY',
          musicId: 'track-active-1',
          musicVolume: -0.2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('10. resolves ORIGINAL_ONLY canonical configuration correctly', async () => {
      const resolved = await musicService.validateAndResolveAudioConfig(
        {
          audioMode: 'ORIGINAL_ONLY',
          originalVolume: 0.8,
        },
        'creator_bob',
      );
      expect(resolved?.audioMode).toBe('ORIGINAL_ONLY');
      expect(resolved?.originalVolume).toBe(0.8);
      expect(resolved?.musicVolume).toBe(0);
      expect(resolved?.originalAudioName).toBe('Original audio · @creator_bob');
    });

    it('11. resolves MUSIC_ONLY and enforces originalVolume = 0', async () => {
      const resolved = await musicService.validateAndResolveAudioConfig({
        audioMode: 'MUSIC_ONLY',
        musicId: 'track-active-1',
        musicVolume: 0.9,
      });
      expect(resolved?.audioMode).toBe('MUSIC_ONLY');
      expect(resolved?.originalVolume).toBe(0);
      expect(resolved?.musicVolume).toBe(0.9);
      expect(resolved?.musicTitle).toBe('Cinematic Dawn');
    });

    it('12. resolves MIXED with canonical attribution from database (never spoofable)', async () => {
      const resolved = await musicService.validateAndResolveAudioConfig({
        audioMode: 'MIXED',
        musicId: 'track-active-2',
        musicTitle: 'Fake Title Spoofed By Client',
        musicArtist: 'Fake Artist Spoofed By Client',
        sourceStart: 5,
        sourceEnd: 35,
        originalVolume: 0.6,
        musicVolume: 0.8,
      });
      expect(resolved?.audioMode).toBe('MIXED');
      // Must use canonical DB title, ignoring client-provided spoofed title
      expect(resolved?.musicTitle).toBe('Acoustic Horizon');
      expect(resolved?.musicArtist).toBe('Aurora Sound');
      expect(resolved?.attributionText).toBe(
        'Acoustic Horizon by Aurora Sound',
      );
      expect(resolved?.sourceStart).toBe(5);
      expect(resolved?.sourceEnd).toBe(35);
    });
  });

  // =========================================================================
  // 3. FFMPEG AUDIO PROCESSING FIXTURES (Items 13, 14, 15, 16, 17)
  // =========================================================================
  describe('3. Real FFmpeg Video + Audio Mixing Engine', () => {
    let videoWithAudio: string;
    let videoWithoutAudio: string;
    let musicTrack10s: string;

    beforeAll(() => {
      // 1. Create a 4s video with 440Hz sine audio
      videoWithAudio = createTempPath('v_audio_4s', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=4:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=4 -c:v libx264 -c:a aac -shortest ${videoWithAudio}`,
      );

      // 2. Create a 4s video without audio
      videoWithoutAudio = createTempPath('v_no_audio_4s', '.mp4');
      execSync(
        `ffmpeg -y -v error -f lavfi -i testsrc=duration=4:size=640x360:rate=30 -an -c:v libx264 ${videoWithoutAudio}`,
      );

      // 3. Create a 10s music audio asset (880Hz sine wave)
      musicTrack10s = createTempPath('music_10s', '.mp3');
      execSync(
        `ffmpeg -y -v error -f lavfi -i sine=frequency=880:duration=10 -c:a libmp3lame ${musicTrack10s}`,
      );
    });

    it('13. processes MIXED mode: combines video audio + music with FFmpeg amix filter', async () => {
      const out = createTempPath('mixed_out', '.mp4');
      const poster = createTempPath('mixed_poster', '.jpg');

      const result = await videoProcessor.processVideo(
        videoWithAudio,
        out,
        poster,
        {
          trimStart: 0,
          trimEnd: 4,
          audioConfig: {
            audioMode: 'MIXED',
            musicPath: musicTrack10s,
            musicStart: 2,
            musicEnd: 6,
            originalVolume: 0.5,
            musicVolume: 0.8,
          },
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(3.5);
      expect(result.duration).toBeLessThanOrEqual(4.5);

      // Inspect output streams using ffprobe
      const probe = await videoProcessor.probeMedia(result.outputPath);
      expect(probe.hasAudio).toBe(true);
      expect(probe.audioCodec).toBe('aac');
      expect(probe.videoCodec).toBe('h264');
    });

    it('14. processes MUSIC_ONLY mode: replaces original audio with trimmed music segment', async () => {
      const out = createTempPath('music_only_out', '.mp4');
      const poster = createTempPath('music_only_poster', '.jpg');

      const result = await videoProcessor.processVideo(
        videoWithAudio,
        out,
        poster,
        {
          trimStart: 0,
          trimEnd: 3,
          audioConfig: {
            audioMode: 'MUSIC_ONLY',
            musicPath: musicTrack10s,
            musicStart: 1,
            musicEnd: 4,
            musicVolume: 1.0,
          },
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      const probe = await videoProcessor.probeMedia(result.outputPath);
      expect(probe.hasAudio).toBe(true);
      expect(probe.audioCodec).toBe('aac');
      expect(result.duration).toBeGreaterThanOrEqual(2.5);
      expect(result.duration).toBeLessThanOrEqual(3.5);
    });

    it('15. handles video without audio in MIXED mode: cleanly adds music without failing', async () => {
      const out = createTempPath('no_audio_mixed_out', '.mp4');
      const poster = createTempPath('no_audio_mixed_poster', '.jpg');

      const result = await videoProcessor.processVideo(
        videoWithoutAudio,
        out,
        poster,
        {
          trimStart: 0,
          trimEnd: 4,
          audioConfig: {
            audioMode: 'MIXED',
            musicPath: musicTrack10s,
            musicStart: 0,
            musicEnd: 4,
            originalVolume: 0.5,
            musicVolume: 1.0,
          },
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      const probe = await videoProcessor.probeMedia(result.outputPath);
      expect(probe.hasAudio).toBe(true);
      expect(probe.audioCodec).toBe('aac');
    });

    it('16. handles ORIGINAL_ONLY mode: preserves original audio path without music', async () => {
      const out = createTempPath('orig_only_out', '.mp4');
      const poster = createTempPath('orig_only_poster', '.jpg');

      const result = await videoProcessor.processVideo(
        videoWithAudio,
        out,
        poster,
        {
          trimStart: 1,
          trimEnd: 3,
          audioConfig: {
            audioMode: 'ORIGINAL_ONLY',
            originalVolume: 0.7,
          },
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      const probe = await videoProcessor.probeMedia(result.outputPath);
      expect(probe.hasAudio).toBe(true);
      expect(probe.audioCodec).toBe('aac');
      expect(result.duration).toBeGreaterThanOrEqual(1.5);
      expect(result.duration).toBeLessThanOrEqual(2.5);
    });
  });

  // =========================================================================
  // 4. RETRY, IDEMPOTENCY & PUBLISHING WORKFLOW (Items 18, 19, 20, 21, 22)
  // =========================================================================
  describe('4. Publishing Workflow & Idempotency', () => {
    it('18. allows retrying media job with updated audio configuration', async () => {
      const job = await mediaJobService.createJob({
        userId: 'user-1',
        sourceKey: 'community/test/video.mp4',
        sourceUrl: 'https://cdn.zeitnah.app/video.mp4',
        mimeType: 'video/mp4',
        sourceSize: 5000000,
        audioConfig: { audioMode: 'ORIGINAL_ONLY' },
      });

      // Update to MIXED on retry
      const updatedJob = await mediaJobService.retryJob(
        job.mediaId,
        'user-1',
        false,
        {
          audioConfig: { audioMode: 'MIXED', musicId: 'track-active-1' },
        },
      );

      expect(updatedJob.status).toBe('QUEUED');
      expect(updatedJob.audioConfig?.audioMode).toBe('MIXED');
    });

    it('19. rejects post publication before media processing is READY', async () => {
      const job = await mediaJobService.createJob({
        userId: 'user-1',
        sourceKey: 'community/test/video.mp4',
        sourceUrl: 'https://cdn.zeitnah.app/video.mp4',
        mimeType: 'video/mp4',
        sourceSize: 5000000,
      });

      // Job is QUEUED
      await expect(
        postService.createPost('user-1', {
          content: 'My Reel',
          type: 'VIDEO' as any,
          audience: 'PUBLIC' as any,
          media: [
            {
              url: 'https://cdn.zeitnah.app/video.mp4',
              type: 'video',
              mediaId: job.mediaId,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('20. publishes Reel with canonical audio metadata attached to post media', async () => {
      const job = await mediaJobService.createJob({
        userId: 'user-1',
        sourceKey: 'community/test/video.mp4',
        sourceUrl: 'https://cdn.zeitnah.app/video.mp4',
        mimeType: 'video/mp4',
        sourceSize: 5000000,
      });

      // Mark job as READY
      job.status = 'READY';
      job.outputUrl = 'https://cdn.zeitnah.app/processed.mp4';
      job.posterUrl = 'https://cdn.zeitnah.app/poster.jpg';
      job.outputDuration = 15;

      const post = await postService.createPost('user-1', {
        content: 'Finished Reel with Music',
        type: 'VIDEO' as any,
        audience: 'PUBLIC' as any,
        media: [
          {
            url: 'https://cdn.zeitnah.app/video.mp4',
            type: 'video',
            mediaId: job.mediaId,
            audioConfig: {
              audioMode: 'MIXED',
              musicId: 'track-active-1',
              musicTitle: 'Spoofed By Attacker',
            },
          },
        ],
      });

      expect(post.media[0].audioConfig?.audioMode).toBe('MIXED');
      // Server-side canonical resolution
      expect(post.media[0].audioConfig?.musicTitle).toBe('Cinematic Dawn');
      expect(post.media[0].audioConfig?.musicArtist).toBe('Zeitnah Music');
    });

    it('21. guarantees backward compatibility for legacy Reels without audioConfig', async () => {
      const legacyPost = await postService.createPost('user-1', {
        content: 'Legacy Reel without audio',
        type: 'VIDEO' as any,
        audience: 'PUBLIC' as any,
        media: [
          {
            url: 'https://cdn.zeitnah.app/legacy.mp4',
            type: 'video',
          },
        ],
      });

      expect(legacyPost.media[0].url).toBe(
        'https://cdn.zeitnah.app/legacy.mp4',
      );
      expect(legacyPost.media[0].audioConfig).toBeUndefined();
    });
  });
});
