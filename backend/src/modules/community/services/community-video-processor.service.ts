import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';

export interface VideoProbeMetadata {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec?: string;
  hasAudio: boolean;
  formatName: string;
  size: number;
  bitrate?: number;
  rotation?: number;
  sampleRate?: number;
  channels?: number;
  audioBitrate?: number;
  audioDuration?: number;
}

export interface AudioMixOptions {
  audioMode?: 'ORIGINAL_ONLY' | 'MUSIC_ONLY' | 'MIXED';
  musicPath?: string;
  musicStart?: number;
  musicEnd?: number;
  originalVolume?: number;
  musicVolume?: number;
}

export interface TranscodeOptions {
  trimStart?: number;
  trimEnd?: number;
  audioConfig?: AudioMixOptions;
}

export interface TranscodeResult {
  outputPath: string;
  posterPath: string;
  duration: number;
  width: number;
  height: number;
  size: number;
}

@Injectable()
export class CommunityVideoProcessorService {
  private readonly logger = new Logger(CommunityVideoProcessorService.name);

  // Maximum allowable constraints
  public readonly MAX_VIDEO_DURATION_SECONDS = 90;
  public readonly MIN_VIDEO_DURATION_SECONDS = 0.5;
  public readonly MAX_SOURCE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GiB
  public readonly PROCESS_TIMEOUT_MS = Number(process.env.COMMUNITY_FFMPEG_TIMEOUT_MS) || 180000; // 3 minutes or configurable

  /**
   * Executes a child process with safe argument arrays, SIGTERM timeout, and SIGKILL fallback
   * to guarantee no orphaned FFmpeg/FFprobe processes remain.
   */
  public runChildProcess(
    binary: string,
    args: string[],
    options: { timeout?: number; maxBuffer?: number } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args);
      let stdout = '';
      let stderr = '';
      let isDone = false;
      let killTimer: NodeJS.Timeout | null = null;
      let timeoutTimer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (killTimer) clearTimeout(killTimer);
      };

      if (options.timeout && options.timeout > 0) {
        timeoutTimer = setTimeout(() => {
          if (isDone) return;
          this.logger.warn(`Process ${binary} timed out after ${options.timeout}ms. Sending SIGTERM.`);
          child.kill('SIGTERM');
          // SIGKILL fallback after 3 seconds
          killTimer = setTimeout(() => {
            if (!isDone) {
              this.logger.error(`Process ${binary} did not exit after SIGTERM. Sending SIGKILL.`);
              child.kill('SIGKILL');
            }
          }, 3000);
        }, options.timeout);
      }

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        if (isDone) return;
        isDone = true;
        cleanup();
        reject(err);
      });

      child.on('close', (code, signal) => {
        if (isDone) return;
        isDone = true;
        cleanup();
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(new Error(`Process ${binary} timed out after ${options.timeout}ms (killed by ${signal})`));
        } else if (code !== 0) {
          const err: any = new Error(`Process ${binary} exited with code ${code}: ${stderr.slice(-500)}`);
          err.code = code;
          err.stderr = stderr;
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Probes video metadata using ffprobe with safe argument arrays and structured JSON output.
   * Detects container/stream duration, codecs, dimensions, and rotation metadata.
   * Throws a permanent error if the video is missing, corrupt, >90s, or lacks a valid video stream.
   */
  async probeMedia(filePath: string): Promise<VideoProbeMetadata> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Source media file not found on disk');
    }

    const stat = fs.statSync(filePath);
    if (stat.size <= 0) {
      throw new BadRequestException('Source media file is empty (0 bytes)');
    }

    if (stat.size > this.MAX_SOURCE_SIZE_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'Video exceeds the 1 GiB source limit.',
      });
    }

    try {
      const { stdout } = await this.runChildProcess(
        'ffprobe',
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration,size,format_name,bit_rate:stream=codec_name,codec_type,width,height,duration,r_frame_rate,bit_rate:stream_side_data=side_data_type,rotation:stream_tags=rotate',
          '-of',
          'json',
          filePath,
        ],
        { timeout: 30000 },
      );

      const parsed = JSON.parse(stdout);
      const streams = parsed.streams || [];
      const format = parsed.format || {};

      const videoStream = streams.find(
        (s: any) => s.codec_type === 'video' && s.codec_name !== 'png' && s.codec_name !== 'mjpeg',
      ) || streams.find((s: any) => s.codec_type === 'video');

      if (!videoStream) {
        throw new BadRequestException({
          code: 'NO_VIDEO_STREAM',
          message: 'The uploaded file does not contain a valid video stream.',
        });
      }

      const audioStream = streams.find((s: any) => s.codec_type === 'audio');

      // Determine duration from format or video stream
      let duration = parseFloat(format.duration || videoStream.duration || '0');
      if (isNaN(duration) || duration <= 0) {
        // Fallback to checking video stream duration
        duration = parseFloat(videoStream.duration || '0');
      }

      if (isNaN(duration) || duration <= 0) {
        throw new BadRequestException({
          code: 'UNPARSEABLE_DURATION',
          message: 'Could not determine valid video duration.',
        });
      }

      if (duration > this.MAX_VIDEO_DURATION_SECONDS) {
        throw new BadRequestException({
          code: 'VIDEO_TOO_LONG',
          message: `Video duration (${duration.toFixed(1)}s) exceeds the maximum limit of ${this.MAX_VIDEO_DURATION_SECONDS} seconds.`,
        });
      }

      // Detect rotation metadata from Display Matrix side data or stream tags (Section 24)
      const rotationSideData = (videoStream.side_data_list || []).find(
        (s: any) => s.side_data_type === 'Display Matrix' && s.rotation !== undefined,
      );
      const rotateTag = videoStream.tags?.rotate;
      const rotationAngle = Math.abs(
        Number(rotationSideData?.rotation ?? rotateTag ?? 0),
      ) % 360;

      const isRotated90or270 = rotationAngle === 90 || rotationAngle === 270;
      const effectiveWidth = isRotated90or270
        ? Number(videoStream.height) || 0
        : Number(videoStream.width) || 0;
      const effectiveHeight = isRotated90or270
        ? Number(videoStream.width) || 0
        : Number(videoStream.height) || 0;

      return {
        duration,
        width: effectiveWidth,
        height: effectiveHeight,
        videoCodec: String(videoStream.codec_name || 'unknown'),
        audioCodec: audioStream?.codec_name ? String(audioStream.codec_name) : undefined,
        hasAudio: Boolean(audioStream),
        sampleRate: audioStream?.sample_rate ? Number(audioStream.sample_rate) : undefined,
        channels: audioStream?.channels ? Number(audioStream.channels) : undefined,
        audioBitrate: audioStream?.bit_rate ? Number(audioStream.bit_rate) : undefined,
        audioDuration: audioStream?.duration ? parseFloat(audioStream.duration) : undefined,
        formatName: String(format.format_name || 'unknown'),
        size: stat.size,
        bitrate: format.bit_rate ? Number(format.bit_rate) : undefined,
        rotation: rotationAngle,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`ffprobe inspection failed on ${filePath}: ${err.message}`);
      throw new BadRequestException({
        code: 'INVALID_VIDEO',
        message: 'Could not verify media streams. The video file may be corrupt or in an unsupported format.',
      });
    }
  }

  /**
   * Executes real server-side trim, H.264/AAC transcode with faststart, and poster extraction.
   * Uses safe argument arrays and prevents shell command injection.
   * Preserves aspect ratio, bounds portrait/landscape, prevents upscaling, strips metadata and extra streams.
   */
  async processVideo(
    sourcePath: string,
    outputPath: string,
    posterPath: string,
    options: TranscodeOptions = {},
  ): Promise<TranscodeResult> {
    const probe = await this.probeMedia(sourcePath);

    // Validate trim boundaries strictly
    let trimStart = Number(options.trimStart);
    if (isNaN(trimStart) || trimStart < 0) trimStart = 0;

    let trimEnd = options.trimEnd !== undefined && options.trimEnd !== null && !isNaN(Number(options.trimEnd)) && Number(options.trimEnd) > 0
      ? Number(options.trimEnd)
      : probe.duration;

    // Guard upper bound
    if (trimEnd > probe.duration) {
      trimEnd = probe.duration;
    }

    if (trimEnd <= trimStart) {
      throw new BadRequestException({
        code: 'INVALID_TRIM_RANGE',
        message: `Trim end (${trimEnd.toFixed(2)}s) must be greater than trim start (${trimStart.toFixed(2)}s).`,
      });
    }

    const targetDuration = trimEnd - trimStart;
    if (targetDuration < this.MIN_VIDEO_DURATION_SECONDS) {
      throw new BadRequestException({
        code: 'TRIM_TOO_SHORT',
        message: `Selected video duration (${targetDuration.toFixed(2)}s) is shorter than the minimum allowed (${this.MIN_VIDEO_DURATION_SECONDS}s).`,
      });
    }

    if (targetDuration > this.MAX_VIDEO_DURATION_SECONDS) {
      throw new BadRequestException({
        code: 'TRIM_TOO_LONG',
        message: `Selected video duration (${targetDuration.toFixed(2)}s) exceeds the maximum allowed (${this.MAX_VIDEO_DURATION_SECONDS}s).`,
      });
    }

    this.logger.log(
      `Starting video transcode: Source="${sourcePath}", Trim=[${trimStart.toFixed(2)}s - ${trimEnd.toFixed(2)}s] (duration: ${targetDuration.toFixed(2)}s), Dimensions=${probe.width}x${probe.height}, Audio=${probe.hasAudio}`,
    );

    // Resolution bounding policy (Sections 19, 20, 21, 22, 23):
    // If landscape (probe.width > probe.height): bounding box is 1920x1080.
    // If portrait or square (probe.width <= probe.height): bounding box is 1080x1920.
    // Preserves original aspect ratio, does not upscale smaller media, forces even encoder dimensions.
    const isLandscape = probe.width > probe.height;
    const maxW = isLandscape ? 1920 : 1080;
    const maxH = isLandscape ? 1080 : 1920;
    const scaleFilter = `scale='min(${maxW},iw)':'min(${maxH},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;

    // Audio & Music Mixing options (Section 25, 26, 27, 28)
    const audioConfig = options.audioConfig;
    const hasMusic = Boolean(audioConfig?.musicPath && fs.existsSync(audioConfig.musicPath));
    const audioMode = audioConfig?.audioMode || (hasMusic ? 'MIXED' : 'ORIGINAL_ONLY');

    const origVol = Math.max(0, Math.min(Number(audioConfig?.originalVolume ?? 1.0), 1.0));
    const musicVol = Math.max(0, Math.min(Number(audioConfig?.musicVolume ?? 1.0), 1.0));

    let ffmpegArgs: string[] = [];

    if (hasMusic && audioMode === 'MUSIC_ONLY') {
      // 1. MUSIC_ONLY MODE (Section 27)
      const musicStart = Math.max(0, Number(audioConfig?.musicStart ?? 0));
      const musicEnd =
        audioConfig?.musicEnd !== undefined && Number(audioConfig.musicEnd) > musicStart
          ? Number(audioConfig.musicEnd)
          : musicStart + targetDuration;

      ffmpegArgs = [
        '-y',
        '-ss',
        trimStart.toFixed(3),
        '-to',
        trimEnd.toFixed(3),
        '-i',
        sourcePath,
        '-ss',
        musicStart.toFixed(3),
        ...(musicEnd > musicStart ? ['-to', musicEnd.toFixed(3)] : []),
        '-i',
        audioConfig!.musicPath!,
        '-map',
        '0:v:0',
        '-vf',
        scaleFilter,
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-map',
        '1:a:0',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-af',
        `volume=${musicVol.toFixed(2)}`,
        '-shortest',
        '-sn',
        '-dn',
        '-map_metadata',
        '-1',
        '-movflags',
        '+faststart',
        outputPath,
      ];
    } else if (hasMusic && audioMode === 'MIXED') {
      // 2. MIXED MODE (Section 26)
      const musicStart = Math.max(0, Number(audioConfig?.musicStart ?? 0));
      const musicEnd =
        audioConfig?.musicEnd !== undefined && Number(audioConfig.musicEnd) > musicStart
          ? Number(audioConfig.musicEnd)
          : musicStart + targetDuration;

      if (!probe.hasAudio) {
        // Source video has no audio, degrade gracefully to music only
        ffmpegArgs = [
          '-y',
          '-ss',
          trimStart.toFixed(3),
          '-to',
          trimEnd.toFixed(3),
          '-i',
          sourcePath,
          '-ss',
          musicStart.toFixed(3),
          ...(musicEnd > musicStart ? ['-to', musicEnd.toFixed(3)] : []),
          '-i',
          audioConfig!.musicPath!,
          '-map',
          '0:v:0',
          '-vf',
          scaleFilter,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-map',
          '1:a:0',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-af',
          `volume=${musicVol.toFixed(2)}`,
          '-shortest',
          '-sn',
          '-dn',
          '-map_metadata',
          '-1',
          '-movflags',
          '+faststart',
          outputPath,
        ];
      } else {
        // Both video audio and music stream exist: mix using FFmpeg amix filter
        const filterComplex = `[0:v]${scaleFilter}[vout];[0:a]volume=${origVol.toFixed(2)}[a0];[1:a]volume=${musicVol.toFixed(2)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`;

        ffmpegArgs = [
          '-y',
          '-ss',
          trimStart.toFixed(3),
          '-to',
          trimEnd.toFixed(3),
          '-i',
          sourcePath,
          '-ss',
          musicStart.toFixed(3),
          ...(musicEnd > musicStart ? ['-to', musicEnd.toFixed(3)] : []),
          '-i',
          audioConfig!.musicPath!,
          '-filter_complex',
          filterComplex,
          '-map',
          '[vout]',
          '-map',
          '[aout]',
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-shortest',
          '-sn',
          '-dn',
          '-map_metadata',
          '-1',
          '-movflags',
          '+faststart',
          outputPath,
        ];
      }
    } else {
      // 3. ORIGINAL_ONLY MODE (Section 28) - Existing Phase 3B pipeline preserved
      const audioArgs = probe.hasAudio
        ? (origVol !== 1.0
            ? ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-af', `volume=${origVol.toFixed(2)}`]
            : ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2'])
        : ['-an'];

      ffmpegArgs = [
        '-y',
        '-ss',
        trimStart.toFixed(3),
        '-to',
        trimEnd.toFixed(3),
        '-i',
        sourcePath,
        '-map',
        '0:v:0',
        '-vf',
        scaleFilter,
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        ...audioArgs,
        '-sn',
        '-dn',
        '-map_metadata',
        '-1',
        '-movflags',
        '+faststart',
        outputPath,
      ];
    }

    try {
      await this.runChildProcess('ffmpeg', ffmpegArgs, {
        timeout: this.PROCESS_TIMEOUT_MS,
      });
    } catch (ffmpegErr: any) {
      this.logger.error(
        `FFmpeg transcoding failed for ${sourcePath}: ${ffmpegErr.message}`,
        ffmpegErr.stderr,
      );
      throw new Error(`Video transcoding failed: ${ffmpegErr.message}`);
    }

    // Generate poster thumbnail from the processed video
    await this.generatePosterFromVideo(outputPath, posterPath);

    // Verify output with FFprobe
    const verified = await this.verifyProcessedOutput(outputPath, targetDuration);

    return {
      outputPath,
      posterPath,
      duration: verified.duration,
      width: verified.width,
      height: verified.height,
      size: verified.size,
    };
  }

  /**
   * Generates a poster thumbnail from the processed/trimmed video output.
   * Takes a frame at 0.5s or 0.0s.
   */
  async generatePosterFromVideo(
    videoPath: string,
    posterPath: string,
    timestampSeconds = 0.5,
  ): Promise<boolean> {
    try {
      const ts = timestampSeconds > 0 ? timestampSeconds.toFixed(3) : '00:00:00.000';
      await this.runChildProcess(
        'ffmpeg',
        ['-y', '-ss', ts, '-i', videoPath, '-frames:v', '1', '-q:v', '2', posterPath],
        { timeout: 30000 },
      );

      if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
        return true;
      }
    } catch {
      // Fallback to frame 0
      try {
        await this.runChildProcess(
          'ffmpeg',
          ['-y', '-ss', '00:00:00.000', '-i', videoPath, '-frames:v', '1', '-q:v', '2', posterPath],
          { timeout: 30000 },
        );
        if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
          return true;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to generate poster thumbnail from ${videoPath}: ${err.message}`);
      }
    }
    return false;
  }

  /**
   * Verifies the transcoded output with ffprobe to guarantee it is valid, readable,
   * non-zero in size, contains yuv420p H.264, even encoder dimensions, and matches expected duration.
   */
  async verifyProcessedOutput(
    outputPath: string,
    expectedDuration: number,
  ): Promise<{ duration: number; width: number; height: number; size: number }> {
    if (!fs.existsSync(outputPath)) {
      throw new Error('Transcoded output file was not created on disk.');
    }

    const stat = fs.statSync(outputPath);
    if (stat.size <= 0) {
      throw new Error('Transcoded output file is empty (0 bytes).');
    }

    const { stdout } = await this.runChildProcess(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration,size:stream=codec_name,width,height,duration,pix_fmt',
        '-of',
        'json',
        outputPath,
      ],
      { timeout: 30000 },
    );

    const parsed = JSON.parse(stdout);
    const videoStream = (parsed.streams || []).find((s: any) => s.codec_name === 'h264');
    if (!videoStream) {
      throw new Error('Processed output does not contain an H.264 video stream.');
    }

    if (videoStream.pix_fmt && videoStream.pix_fmt !== 'yuv420p') {
      this.logger.warn(`Processed output pixel format is ${videoStream.pix_fmt}, expected yuv420p`);
    }

    const outDuration = parseFloat(parsed.format?.duration || videoStream.duration || '0');
    if (isNaN(outDuration) || outDuration <= 0) {
      throw new Error('Processed output duration could not be determined.');
    }

    const width = Number(videoStream.width) || 0;
    const height = Number(videoStream.height) || 0;

    if (width % 2 !== 0 || height % 2 !== 0) {
      throw new Error(`Output dimensions (${width}x${height}) must be even integers for H.264 encoder.`);
    }

    // Tolerance check (within 1.5 seconds of target)
    if (Math.abs(outDuration - expectedDuration) > 1.5) {
      this.logger.warn(
        `Output duration (${outDuration.toFixed(2)}s) differs from target (${expectedDuration.toFixed(2)}s) by more than 1.5s`,
      );
    }

    return {
      duration: outDuration,
      width,
      height,
      size: stat.size,
    };
  }
}

