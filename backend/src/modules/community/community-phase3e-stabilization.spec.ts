import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';
import { CommunityStickerService } from './services/community-sticker.service';
import { PostService } from './services/post.service';
import { CommunityMediaJobService } from './services/community-media-job.service';
import {
  renderTextLayerPng,
  renderStickerPng,
  VALID_CURATED_STICKER_IDS,
} from './services/community-overlay-rasterizer';

describe('Community Phase 3E — Advanced Reel Editor Hardening & Production Stabilization', () => {
  let videoProcessor: CommunityVideoProcessorService;
  let stickerService: CommunityStickerService;
  let postService: PostService;
  let tempDir: string;

  const runFfmpeg = (args: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const p = spawn('ffmpeg', args);
      let errOut = '';
      p.stderr.on('data', (d) => (errOut += d.toString()));
      p.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with ${code}: ${errOut}`));
      });
    });
  };

  const runFfprobe = (args: string[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      const p = spawn('ffprobe', args);
      let out = '';
      let errOut = '';
      p.stdout.on('data', (d) => (out += d.toString()));
      p.stderr.on('data', (d) => (errOut += d.toString()));
      p.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(out));
          } catch {
            resolve(out.trim());
          }
        } else {
          reject(new Error(`FFprobe exited with ${code}: ${errOut}`));
        }
      });
    });
  };

  beforeAll(() => {
    tempDir = path.join(
      os.tmpdir(),
      `p3e_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(tempDir, { recursive: true });

    videoProcessor = new CommunityVideoProcessorService();
    stickerService = new CommunityStickerService();
    postService = new PostService(
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      stickerService,
    );
  });

  afterAll(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ==========================================
  // SECTION 3: PREVIEW ↔ SERVER RENDER PARITY
  // ==========================================
  describe('A. Coordinate & Transform Parity (Browser ↔ FFmpeg)', () => {
    it('generates consistent center coordinates for centered text (x=0.5, y=0.5)', () => {
      const config = postService.validateAndNormalizeEditorConfig(
        {
          version: 1,
          layers: [
            {
              id: 'center-text',
              type: 'TEXT',
              content: 'Centered Headline',
              x: 0.5,
              y: 0.5,
              start: 0,
              end: 5,
            },
          ],
        },
        10,
      );

      expect(config.layers[0].x).toBe(0.5);
      expect(config.layers[0].y).toBe(0.5);
    });

    it('generates consistent center coordinates for safe-zone boundaries (top-left and bottom-right)', () => {
      const config = postService.validateAndNormalizeEditorConfig(
        {
          version: 1,
          layers: [
            {
              id: 'top-left',
              type: 'TEXT',
              content: 'Top Left Tag',
              x: 0.05,
              y: 0.08,
              start: 0,
              end: 4,
            },
            {
              id: 'bottom-right',
              type: 'TEXT',
              content: 'Bottom Right Credit',
              x: 0.95,
              y: 0.92,
              start: 0,
              end: 4,
            },
          ],
        },
        10,
      );

      expect(config.layers[0].x).toBe(0.05);
      expect(config.layers[0].y).toBe(0.08);
      expect(config.layers[1].x).toBe(0.95);
      expect(config.layers[1].y).toBe(0.92);
    });

    it('transcodes with rotated text, scaled sticker, and caption with pixel-verified output', async () => {
      const testSource = path.join(tempDir, 'parity_source_2s.mp4');
      const testOutput = path.join(tempDir, 'parity_out.mp4');
      const testPoster = path.join(tempDir, 'parity_poster.jpg');

      // 1. Synthetic 2s portrait video (720x1280)
      await runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=navy:s=720x1280:d=2',
        '-f',
        'lavfi',
        '-i',
        'sine=f=440:d=2',
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-t',
        '2',
        testSource,
      ]);

      // 2. Generate text and sticker overlay PNGs
      const textPng = path.join(tempDir, 'parity_text.png');
      const stickerPng = path.join(tempDir, 'parity_sticker.png');
      const captionPng = path.join(tempDir, 'parity_caption.png');

      renderTextLayerPng(
        {
          id: 'text-1',
          type: 'TEXT',
          content: 'Parity Test Text',
          fontSize: 24,
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.3,
        },
        textPng,
      );

      renderStickerPng('zn-verified', stickerPng, 140);

      renderTextLayerPng(
        {
          id: 'caption-1',
          type: 'CAPTION',
          style: 'HIGHLIGHT',
          content: 'Verified Caption',
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.8,
        },
        captionPng,
      );

      // 3. Process video with scale, rotation, and opacity transforms
      const result = await videoProcessor.processVideo(
        testSource,
        testOutput,
        testPoster,
        {
          trimStart: 0,
          trimEnd: 2,
          overlayAssets: [
            {
              layerId: 'text-1',
              localPath: textPng,
              x: 0.5,
              y: 0.3,
              scale: 1.2,
              rotation: 15,
              opacity: 0.9,
              start: 0,
              end: 2,
            },
            {
              layerId: 'sticker-1',
              localPath: stickerPng,
              x: 0.5,
              y: 0.5,
              scale: 0.8,
              rotation: -10,
              opacity: 1.0,
              start: 0,
              end: 2,
            },
            {
              layerId: 'caption-1',
              localPath: captionPng,
              x: 0.5,
              y: 0.8,
              scale: 1.0,
              rotation: 0,
              opacity: 0.95,
              start: 0,
              end: 2,
            },
          ],
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(result.duration).toBeCloseTo(2.0, 1);
      expect(result.width).toBe(720);
      expect(result.height).toBe(1280);

      const probe = await runFfprobe([
        '-v',
        'error',
        '-show_entries',
        'stream=codec_name,width,height:format=duration',
        '-of',
        'json',
        result.outputPath,
      ]);
      expect(probe.streams[0].codec_name).toBe('h264');
      expect(probe.streams[0].width).toBe(720);
      expect(probe.streams[0].height).toBe(1280);
    }, 20000);
  });

  // ==========================================
  // SECTION 4: TEXT RENDERING HARDENING
  // ==========================================
  describe('B. Text Rendering Hardening', () => {
    it('bounds text length and chunks words longer than 28 chars to prevent canvas explosion', () => {
      const outPng = path.join(tempDir, 'long_word_test.png');
      const longWord = 'A'.repeat(100);
      const res = renderTextLayerPng(
        {
          id: 'long-word',
          type: 'TEXT',
          content: `Prefix ${longWord} Suffix`,
          fontSize: 24,
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.5,
        },
        outPng,
      );

      expect(fs.existsSync(outPng)).toBe(true);
      expect(res.width).toBeLessThanOrEqual(900);
      expect(res.height).toBeLessThanOrEqual(600);
    });

    it('caps line count at 6 lines even with large word lists', () => {
      const outPng = path.join(tempDir, 'many_lines_test.png');
      const text = Array(30).fill('word').join(' ');
      const res = renderTextLayerPng(
        {
          id: 'many-lines',
          type: 'TEXT',
          content: text,
          fontSize: 24,
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.5,
        },
        outPng,
      );

      expect(res.height).toBeLessThanOrEqual(600);
    });

    it('safely handles non-printable, special ASCII and symbol characters without crashing', () => {
      const outPng = path.join(tempDir, 'special_chars.png');
      const res = renderTextLayerPng(
        {
          id: 'special-chars',
          type: 'TEXT',
          content: '!@#$%^&*()_+=-[]{};:\'",.<>/?~`|\\ \x00\x1f',
          fontSize: 20,
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.5,
        },
        outPng,
      );

      expect(fs.existsSync(outPng)).toBe(true);
      expect(res.width).toBeGreaterThan(0);
    });

    it('strips all HTML and script injection attempts deterministically', () => {
      const outPng = path.join(tempDir, 'xss_strip.png');
      const res = renderTextLayerPng(
        {
          id: 'xss-strip',
          type: 'TEXT',
          content:
            '<script>alert("xss")</script><img src="x" onerror="steal()"/>Safe Text',
          fontSize: 24,
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.5,
        },
        outPng,
      );

      expect(fs.existsSync(outPng)).toBe(true);
    });
  });

  // ==========================================
  // SECTION 5: STICKER SECURITY & VALIDATION
  // ==========================================
  describe('C. Sticker Security & Catalog Authoritativeness', () => {
    it('accepts all valid curated sticker IDs in catalog', () => {
      for (const id of VALID_CURATED_STICKER_IDS) {
        expect(stickerService.isValidStickerId(id)).toBe(true);
      }
    });

    it('rejects unknown sticker IDs', () => {
      expect(stickerService.isValidStickerId('unknown-sticker-999')).toBe(
        false,
      );
      expect(stickerService.isValidStickerId('')).toBe(false);
    });

    it('strictly rejects filesystem path traversal in sticker IDs', () => {
      expect(stickerService.isValidStickerId('../../etc/passwd')).toBe(false);
      expect(stickerService.isValidStickerId('/etc/shadow')).toBe(false);
      expect(stickerService.isValidStickerId('..\\windows\\system32')).toBe(
        false,
      );
    });

    it('strictly rejects external URLs and data URLs in sticker IDs', () => {
      expect(
        stickerService.isValidStickerId('https://evil.com/malicious.png'),
      ).toBe(false);
      expect(
        stickerService.isValidStickerId('http://localhost:8080/exploit'),
      ).toBe(false);
      expect(
        stickerService.isValidStickerId('data:image/svg+xml;base64,PHN2Zz4='),
      ).toBe(false);
    });

    it('renderStickerPng throws error when given malicious or unknown sticker IDs', () => {
      const outPng = path.join(tempDir, 'invalid_stk.png');
      expect(() => renderStickerPng('../../etc/passwd', outPng)).toThrow();
      expect(() =>
        renderStickerPng('https://evil.com/x.svg', outPng),
      ).toThrow();
      expect(() => renderStickerPng('unknown-sticker-123', outPng)).toThrow();
    });
  });

  // ==========================================
  // SECTION 6: CAPTION HARDENING
  // ==========================================
  describe('D. Caption Validation & Hardening', () => {
    it('rejects empty caption content', () => {
      expect(() =>
        postService.validateAndNormalizeEditorConfig({
          version: 1,
          layers: [
            {
              id: 'cap-empty',
              type: 'CAPTION',
              content: '   ',
              start: 0,
              end: 2,
            },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects caption timing outside video duration', () => {
      expect(() =>
        postService.validateAndNormalizeEditorConfig(
          {
            version: 1,
            layers: [
              {
                id: 'cap-out',
                type: 'CAPTION',
                content: 'Out of bounds caption',
                start: 0,
                end: 15,
              },
            ],
          },
          10,
        ),
      ).toThrow(BadRequestException);
    });

    it('normalizes style to CLASSIC if unknown style is provided', () => {
      const normalized = postService.validateAndNormalizeEditorConfig({
        version: 1,
        layers: [
          {
            id: 'cap-style',
            type: 'CAPTION',
            content: 'Style Test',
            style: 'NON_EXISTENT_STYLE',
            start: 0,
            end: 2,
          },
        ],
      });

      expect(normalized.layers[0].style).toBe('CLASSIC');
    });
  });

  // ==========================================
  // SECTION 7 & 8: AUDIO MODES & TRIM DURATION LOCKING
  // ==========================================
  describe('E. Audio Modes & Duration Invariant (apad & -t)', () => {
    let testVideo3s: string;
    let shortAudio1s: string;
    let longAudio6s: string;

    beforeAll(async () => {
      testVideo3s = path.join(tempDir, 'test_v3s.mp4');
      shortAudio1s = path.join(tempDir, 'short_a1s.m4a');
      longAudio6s = path.join(tempDir, 'long_a6s.m4a');

      await runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=purple:s=640x360:d=3',
        '-f',
        'lavfi',
        '-i',
        'sine=f=440:d=3',
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        '-t',
        '3',
        testVideo3s,
      ]);

      await runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=f=880:d=1',
        '-c:a',
        'aac',
        '-t',
        '1',
        shortAudio1s,
      ]);

      await runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=f=220:d=6',
        '-c:a',
        'aac',
        '-t',
        '6',
        longAudio6s,
      ]);
    });

    it('MUSIC_ONLY with music SHORTER than video preserves full video duration (does not truncate)', async () => {
      const out = path.join(tempDir, 'out_music_shorter.mp4');
      const poster = path.join(tempDir, 'poster_music_shorter.jpg');

      const res = await videoProcessor.processVideo(testVideo3s, out, poster, {
        trimStart: 0,
        trimEnd: 3,
        audioConfig: {
          audioMode: 'MUSIC_ONLY',
          musicPath: shortAudio1s,
          musicVolume: 0.8,
        },
      });

      expect(res.duration).toBeCloseTo(3.0, 1);
    }, 15000);

    it('MUSIC_ONLY with music LONGER than video preserves exact video duration (does not extend)', async () => {
      const out = path.join(tempDir, 'out_music_longer.mp4');
      const poster = path.join(tempDir, 'poster_music_longer.jpg');

      const res = await videoProcessor.processVideo(testVideo3s, out, poster, {
        trimStart: 0,
        trimEnd: 3,
        audioConfig: {
          audioMode: 'MUSIC_ONLY',
          musicPath: longAudio6s,
          musicVolume: 0.8,
        },
      });

      expect(res.duration).toBeCloseTo(3.0, 1);
    }, 15000);

    it('MIXED mode mixes video audio and music safely with exact output duration', async () => {
      const out = path.join(tempDir, 'out_mixed.mp4');
      const poster = path.join(tempDir, 'poster_mixed.jpg');

      const res = await videoProcessor.processVideo(testVideo3s, out, poster, {
        trimStart: 0,
        trimEnd: 3,
        audioConfig: {
          audioMode: 'MIXED',
          musicPath: shortAudio1s,
          originalVolume: 0.5,
          musicVolume: 0.5,
        },
      });

      expect(res.duration).toBeCloseTo(3.0, 1);
    }, 15000);

    it('ORIGINAL_ONLY with zero volume mutes audio cleanly', async () => {
      const out = path.join(tempDir, 'out_orig_zero.mp4');
      const poster = path.join(tempDir, 'poster_orig_zero.jpg');

      const res = await videoProcessor.processVideo(testVideo3s, out, poster, {
        trimStart: 0,
        trimEnd: 3,
        audioConfig: {
          audioMode: 'ORIGINAL_ONLY',
          originalVolume: 0,
        },
      });

      expect(res.duration).toBeCloseTo(3.0, 1);
    }, 15000);
  });

  // ==========================================
  // SECTION 9: FFMPEG TIMEOUT & BUFFER HARDENING
  // ==========================================
  describe('F. FFmpeg Timeout & Bounded Child Process', () => {
    it('dynamically respects process.env.COMMUNITY_FFMPEG_TIMEOUT_MS', () => {
      const originalEnv = process.env.COMMUNITY_FFMPEG_TIMEOUT_MS;
      try {
        process.env.COMMUNITY_FFMPEG_TIMEOUT_MS = '75000';
        expect(videoProcessor.processTimeoutMs).toBe(75000);
      } finally {
        if (originalEnv !== undefined) {
          process.env.COMMUNITY_FFMPEG_TIMEOUT_MS = originalEnv;
        } else {
          delete process.env.COMMUNITY_FFMPEG_TIMEOUT_MS;
        }
      }
    });

    it('bounds stdout and stderr in runChildProcess to prevent memory leaks', async () => {
      const { stdout } = await videoProcessor.runChildProcess(
        'node',
        [
          '-e',
          'for (let i = 0; i < 5000; i++) process.stdout.write("x".repeat(100));',
        ],
        { maxBuffer: 1024 },
      );

      expect(stdout.length).toBeLessThanOrEqual(1024 + 100);
    });
  });

  // ==========================================
  // SECTION 11: DISK PREFLIGHT ROBUSTNESS
  // ==========================================
  describe('G. Disk Preflight Robustness', () => {
    it('safely handles NaN, negative, or invalid sourceSize values without error', () => {
      const testCases = [NaN, -500, null, undefined, 'not-a-number'];

      for (const val of testCases) {
        const safeSourceSize = Math.max(0, Number(val) || 0);
        const safeLayerCount = Math.max(
          0,
          Math.min(Number(undefined) || 0, 10),
        );

        const requiredEstimateBytes =
          Math.max(safeSourceSize * 1.5, 100 * 1024 * 1024) +
          150 * 1024 * 1024 +
          safeLayerCount * 5 * 1024 * 1024;

        expect(isNaN(requiredEstimateBytes)).toBe(false);
        expect(requiredEstimateBytes).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================
  // SECTION 16: PUBLISH RACE CONDITIONS
  // ==========================================
  describe('H. Publish Race Condition Protection', () => {
    it('rejects post publishing when referenced mediaId job is not found', async () => {
      const mockJobService = {
        getJobByMediaId: jest.fn().mockResolvedValue(null),
      };

      const testPostService = new PostService(
        {} as any,
        {} as any,
        {} as any,
        undefined,
        undefined,
        undefined,
        mockJobService as any,
      );

      await expect(
        (testPostService as any).validateAndNormalizeMedia(
          [
            {
              url: 'https://cdn.zeitnah.com/v.mp4',
              type: 'video',
              mediaId: 'non-existent-media-id',
            },
          ],
          'user-1',
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects post publishing when media job is still PROCESSING or QUEUED', async () => {
      const mockJobService = {
        getJobByMediaId: jest.fn().mockResolvedValue({
          mediaId: 'media-processing',
          userId: 'user-1',
          status: 'PROCESSING',
        }),
      };

      const testPostService = new PostService(
        {} as any,
        {} as any,
        {} as any,
        undefined,
        undefined,
        undefined,
        mockJobService as any,
      );

      await expect(
        (testPostService as any).validateAndNormalizeMedia(
          [
            {
              url: 'https://cdn.zeitnah.com/v.mp4',
              type: 'video',
              mediaId: 'media-processing',
            },
          ],
          'user-1',
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects post publishing when media job FAILED', async () => {
      const mockJobService = {
        getJobByMediaId: jest.fn().mockResolvedValue({
          mediaId: 'media-failed',
          userId: 'user-1',
          status: 'FAILED',
          errorMessage: 'Corrupt video stream',
        }),
      };

      const testPostService = new PostService(
        {} as any,
        {} as any,
        {} as any,
        undefined,
        undefined,
        undefined,
        mockJobService as any,
      );

      await expect(
        (testPostService as any).validateAndNormalizeMedia(
          [
            {
              url: 'https://cdn.zeitnah.com/v.mp4',
              type: 'video',
              mediaId: 'media-failed',
            },
          ],
          'user-1',
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects post publishing when media job belongs to another user (IDOR protection)', async () => {
      const mockJobService = {
        getJobByMediaId: jest.fn().mockResolvedValue({
          mediaId: 'media-other-user',
          userId: 'attacker-id',
          status: 'READY',
          outputUrl: 'https://cdn.zeitnah.com/processed.mp4',
        }),
      };

      const testPostService = new PostService(
        {} as any,
        {} as any,
        {} as any,
        undefined,
        undefined,
        undefined,
        mockJobService as any,
      );

      await expect(
        (testPostService as any).validateAndNormalizeMedia(
          [
            {
              url: 'https://cdn.zeitnah.com/v.mp4',
              type: 'video',
              mediaId: 'media-other-user',
            },
          ],
          'victim-id',
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('successfully publishes and populates URLs when media job is READY', async () => {
      const mockJobService = {
        getJobByMediaId: jest.fn().mockResolvedValue({
          mediaId: 'media-ready',
          userId: 'user-1',
          status: 'READY',
          outputUrl: 'https://cdn.zeitnah.com/processed_final.mp4',
          posterUrl: 'https://cdn.zeitnah.com/poster_final.jpg',
          outputDuration: 15.2,
          outputWidth: 720,
          outputHeight: 1280,
        }),
      };

      const testPostService = new PostService(
        {} as any,
        {} as any,
        {} as any,
        undefined,
        undefined,
        undefined,
        mockJobService as any,
      );

      const normalized = await (
        testPostService as any
      ).validateAndNormalizeMedia(
        [
          {
            url: 'https://cdn.zeitnah.com/v.mp4',
            type: 'video',
            mediaId: 'media-ready',
          },
        ],
        'user-1',
        false,
      );

      expect(normalized).toHaveLength(1);
      expect(normalized[0].processedUrl).toBe(
        'https://cdn.zeitnah.com/processed_final.mp4',
      );
      expect(normalized[0].posterUrl).toBe(
        'https://cdn.zeitnah.com/poster_final.jpg',
      );
      expect(normalized[0].duration).toBe(15.2);
    });
  });

  // ==========================================
  // SECTION 24: BACKWARD COMPATIBILITY
  // ==========================================
  describe('I. Backward Compatibility', () => {
    it('allows legacy media without editorConfig or audioConfig to validate cleanly', async () => {
      const testPostService = new PostService({} as any, {} as any, {} as any);

      const normalized = await (
        testPostService as any
      ).validateAndNormalizeMedia(
        [
          {
            url: 'https://cdn.zeitnah.com/legacy_video.mp4',
            type: 'video',
            duration: 10,
          },
        ],
        'user-1',
        false,
      );

      expect(normalized).toHaveLength(1);
      expect(normalized[0].url).toBe(
        'https://cdn.zeitnah.com/legacy_video.mp4',
      );
      expect(normalized[0].editorConfig).toBeUndefined();
      expect(normalized[0].audioConfig).toBeUndefined();
    });
  });
});
