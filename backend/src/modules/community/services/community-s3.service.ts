import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { S3Service } from '../../../common/aws/s3.service';
import { SignedUrlService } from '../../../common/aws/signed-url.service';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

@Injectable()
export class CommunityS3Service {
  private readonly logger = new Logger(CommunityS3Service.name);

  constructor(
    private readonly s3Service: S3Service,
    @Optional() private readonly signedUrlService?: SignedUrlService,
  ) {}

  /**
   * Validates file signature / magic bytes to distinguish real media from renamed malicious binaries.
   * Reads only first 32 bytes from disk or buffer to ensure zero heap buffering for large files.
   */
  validateMagicBytes(
    file: Express.Multer.File | { buffer?: Buffer; path?: string; mimetype: string },
  ): void {
    let buf: Buffer;
    if (file.buffer && file.buffer.length >= 4) {
      buf = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      const fd = fs.openSync(file.path, 'r');
      try {
        buf = Buffer.alloc(32);
        const bytesRead = fs.readSync(fd, buf, 0, 32, 0);
        if (bytesRead < 4) {
          throw new BadRequestException('Invalid or empty file content');
        }
      } finally {
        fs.closeSync(fd);
      }
    } else {
      throw new BadRequestException('Invalid or empty file content');
    }

    const mime = file.mimetype;

    // JPEG: FF D8 FF
    if (mime === 'image/jpeg') {
      if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
        throw new BadRequestException('File content does not match JPEG signature');
      }
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (mime === 'image/png') {
      if (
        buf[0] !== 0x89 ||
        buf[1] !== 0x50 ||
        buf[2] !== 0x4e ||
        buf[3] !== 0x47
      ) {
        throw new BadRequestException('File content does not match PNG signature');
      }
    }
    // GIF: 47 49 46 38
    else if (mime === 'image/gif') {
      if (
        buf[0] !== 0x47 ||
        buf[1] !== 0x49 ||
        buf[2] !== 0x46 ||
        buf[3] !== 0x38
      ) {
        throw new BadRequestException('File content does not match GIF signature');
      }
    }
    // WEBP: RIFF at 0..3 and WEBP at 8..11
    else if (mime === 'image/webp') {
      const isRiff =
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
      const isWebp =
        buf.length >= 12 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50;
      if (!isRiff || !isWebp) {
        throw new BadRequestException('File content does not match WEBP signature');
      }
    }
    // PDF: %PDF (25 50 44 46)
    else if (mime === 'application/pdf') {
      if (
        buf[0] !== 0x25 ||
        buf[1] !== 0x50 ||
        buf[2] !== 0x44 ||
        buf[3] !== 0x46
      ) {
        throw new BadRequestException('File content does not match PDF signature');
      }
    }
    // MP4 / MOV: ftyp or moov box at bytes 4..8
    else if (mime === 'video/mp4' || mime === 'video/quicktime') {
      if (buf.length >= 8) {
        const tag = buf.toString('ascii', 4, 8);
        if (tag !== 'ftyp' && tag !== 'moov') {
          throw new BadRequestException('File content does not match MP4/MOV signature');
        }
      }
    }
    // WEBM: 1A 45 DF A3 (EBML header)
    else if (mime === 'video/webm') {
      if (
        buf[0] !== 0x1a ||
        buf[1] !== 0x45 ||
        buf[2] !== 0xdf ||
        buf[3] !== 0xa3
      ) {
        throw new BadRequestException('File content does not match WebM signature');
      }
    }
  }

  /**
   * Authoritative server-side video duration inspection using ffprobe / ffmpeg.
   * Throws BadRequestException if duration exceeds 90s or if duration cannot be safely determined (fail-closed).
   */
  async getVideoDuration(filePathOrBuffer: string | Buffer): Promise<number> {
    let tempPath: string | null = null;
    let targetPath: string;

    if (typeof filePathOrBuffer === 'string') {
      targetPath = filePathOrBuffer;
    } else {
      tempPath = path.join(os.tmpdir(), `dur-check-${uuidv4()}.tmp`);
      fs.writeFileSync(tempPath, filePathOrBuffer);
      targetPath = tempPath;
    }

    try {
      // 1. Try ffprobe container format duration using safe argument array & timeout
      try {
        const { stdout } = await execFilePromise(
          'ffprobe',
          [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            targetPath,
          ],
          { timeout: 20000, maxBuffer: 10 * 1024 * 1024 },
        );
        const dur = parseFloat(stdout.trim());
        if (!isNaN(dur) && dur > 0) {
          return dur;
        }
      } catch (ffprobeErr: any) {
        this.logger.debug?.(
          `ffprobe format duration check skipped/failed: ${ffprobeErr.message}`,
        );
      }

      // 2. Try ffprobe video stream duration using safe argument array & timeout
      try {
        const { stdout } = await execFilePromise(
          'ffprobe',
          [
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'stream=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            targetPath,
          ],
          { timeout: 20000, maxBuffer: 10 * 1024 * 1024 },
        );
        const dur = parseFloat(stdout.trim());
        if (!isNaN(dur) && dur > 0) {
          return dur;
        }
      } catch (streamErr: any) {
        this.logger.debug?.(
          `ffprobe stream duration check skipped/failed: ${streamErr.message}`,
        );
      }

      // 3. Fallback to ffmpeg stderr inspection using safe argument array & timeout
      try {
        const result = await execFilePromise(
          'ffmpeg',
          ['-i', targetPath],
          { timeout: 20000, maxBuffer: 10 * 1024 * 1024 },
        ).catch((err: any) => ({ stderr: err.stderr || '' }));

        const stderr = (result as any).stderr || '';
        const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (match) {
          const hours = parseFloat(match[1]);
          const minutes = parseFloat(match[2]);
          const seconds = parseFloat(match[3]);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          if (!isNaN(totalSeconds) && totalSeconds > 0) {
            return totalSeconds;
          }
        }
      } catch {}

      this.logger.warn(
        `VIDEO_DURATION_PROBE_FAILED: Target="${path.basename(targetPath)}", Exists=${fs.existsSync(targetPath)}`,
      );

      // Fail-closed: duration cannot be verified
      throw new BadRequestException({
        code: 'INVALID_VIDEO',
        message: 'Could not verify video duration. Please upload a valid video file.',
      });
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
    }
  }

  /**
   * Generates a video poster thumbnail at 1s (or 0s) to serve as a fast video preview poster.
   */
  async generateVideoPoster(videoPath: string, posterPath: string): Promise<boolean> {
    try {
      await execFilePromise(
        'ffmpeg',
        ['-y', '-ss', '00:00:01', '-i', videoPath, '-frames:v', '1', '-q:v', '2', posterPath],
        { timeout: 20000 },
      );
      if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
        return true;
      }
    } catch {
      // If video is shorter than 1s, try 0s
      try {
        await execFilePromise(
          'ffmpeg',
          ['-y', '-ss', '00:00:00', '-i', videoPath, '-frames:v', '1', '-q:v', '2', posterPath],
          { timeout: 20000 },
        );
        if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Server-side image optimization:
   * - Resizes excessively large dimensions (max 2048px bounding box)
   * - Strips EXIF metadata (-map_metadata -1) to prevent GPS/privacy leaks
   * - Preserves format and high visual quality
   */
  async optimizeImage(inputPath: string, outputPath: string): Promise<boolean> {
    try {
      await execFilePromise(
        'ffmpeg',
        ['-y', '-i', inputPath, '-vf', "scale='min(2048,iw)':-2", '-map_metadata', '-1', outputPath],
        { timeout: 20000 },
      );
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return true;
      }
    } catch (err: any) {
      this.logger.warn(`Image optimization skipped or failed: ${err.message}`);
    }
    return false;
  }

  async uploadCommunityMedia(
    file:
      | Express.Multer.File
      | {
          buffer?: Buffer;
          path?: string;
          originalname?: string;
          mimetype: string;
          size: number;
        },
    userId: string,
  ): Promise<{
    url: string;
    size: number;
    mimeType: string;
    duration?: number;
    thumbnailUrl?: string;
  }> {
    if (!userId) {
      throw new BadRequestException('User ID is required for upload');
    }

    const sanitizedOriginalName = (file.originalname || 'file')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-60);
    const fileName = `community/uploads/${userId}/${uuidv4()}-${sanitizedOriginalName}`;

    let duration: number | undefined = undefined;
    let thumbnailUrl: string | undefined = undefined;
    let uploadFilePath = file.path;
    let tempOptFile: string | null = null;
    let tempThumbFile: string | null = null;
    let tempInputFile: string | null = null;

    try {
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');

      // If buffer is provided without disk path (e.g. unit tests), write temp file if video inspection needed
      if (!uploadFilePath && file.buffer && isVideo) {
        tempInputFile = path.join(os.tmpdir(), `input-${uuidv4()}.tmp`);
        fs.writeFileSync(tempInputFile, file.buffer);
        uploadFilePath = tempInputFile;
      }

      // If video: authoritative duration check (<= 90s) & poster thumbnail generation
      if (isVideo) {
        const inputForDuration = uploadFilePath || file.buffer;
        if (inputForDuration) {
          duration = await this.getVideoDuration(inputForDuration);
          if (duration > 90) {
            throw new BadRequestException({
              code: 'VIDEO_TOO_LONG',
              message: 'Video must be 90 seconds or shorter.',
            });
          }
        }

        // Generate video poster thumbnail if we have a path on disk
        if (uploadFilePath) {
          tempThumbFile = path.join(os.tmpdir(), `thumb-${uuidv4()}.jpg`);
          const hasThumb = await this.generateVideoPoster(uploadFilePath, tempThumbFile);
          if (hasThumb && fs.existsSync(tempThumbFile)) {
            const thumbKey = `community/uploads/${userId}/${uuidv4()}-poster.jpg`;
            const thumbSize = fs.statSync(tempThumbFile).size;
            const thumbCommand = new PutObjectCommand({
              Bucket: this.s3Service.bucketName,
              Key: thumbKey,
              Body: fs.createReadStream(tempThumbFile),
              ContentType: 'image/jpeg',
              ContentLength: thumbSize,
            });
            await this.s3Service.s3Client.send(thumbCommand);
            thumbnailUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${thumbKey}`;
            if (this.signedUrlService) {
              try {
                const signedThumb = await this.signedUrlService.generateSignedImageUrl(
                  thumbKey,
                  86400 * 7,
                );
                if (signedThumb) thumbnailUrl = signedThumb;
              } catch {}
            }
          }
        }
      }

      // If image: server-side optimization
      if (
        isImage &&
        uploadFilePath &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ) {
        const ext = path.extname(file.originalname || '.jpg') || '.jpg';
        tempOptFile = path.join(os.tmpdir(), `opt-${uuidv4()}${ext}`);
        const optimized = await this.optimizeImage(uploadFilePath, tempOptFile);
        if (optimized && fs.existsSync(tempOptFile)) {
          uploadFilePath = tempOptFile;
        }
      }

      // Stream upload to S3 (zero heap memory for large files on disk)
      let uploadSize = file.size;
      let body: any = file.buffer;

      if (tempOptFile && fs.existsSync(tempOptFile)) {
        uploadSize = fs.statSync(tempOptFile).size;
        body = fs.createReadStream(tempOptFile);
      } else if (file.path && fs.existsSync(file.path)) {
        uploadSize = file.size || fs.statSync(file.path).size;
        body = fs.createReadStream(file.path);
      } else if (file.buffer) {
        uploadSize = file.size || file.buffer.length;
        body = file.buffer;
      }

      const command = new PutObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: fileName,
        Body: body,
        ContentType: file.mimetype,
        ContentLength: uploadSize,
      });

      await this.s3Service.s3Client.send(command);

      let fileUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${fileName}`;
      if (this.signedUrlService) {
        try {
          const signed = await this.signedUrlService.generateSignedImageUrl(
            fileName,
            86400 * 7,
          );
          if (signed) {
            fileUrl = signed;
          }
        } catch (err: any) {
          this.logger.warn(`Could not presign community media URL: ${err.message}`);
        }
      }

      return {
        url: fileUrl,
        size: uploadSize,
        mimeType: file.mimetype,
        duration,
        thumbnailUrl,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to upload media to S3: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to upload community media to storage',
      );
    } finally {
      // Clean up temporary optimization or thumbnail artifacts
      if (tempOptFile && fs.existsSync(tempOptFile)) {
        try {
          fs.unlinkSync(tempOptFile);
        } catch {}
      }
      if (tempThumbFile && fs.existsSync(tempThumbFile)) {
        try {
          fs.unlinkSync(tempThumbFile);
        } catch {}
      }
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        try {
          fs.unlinkSync(tempInputFile);
        } catch {}
      }
    }
  }

  /**
   * Authoritative security validation for media ownership, S3 bucket target, and path security.
   * Throws ForbiddenException or BadRequestException on any violation.
   * Returns canonical extracted key or clean URL.
   */
  validateMediaOwnership(
    fileUrl: string,
    userId: string,
    isAdmin: boolean = false,
  ): string {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.trim()) {
      throw new BadRequestException('Media URL cannot be empty');
    }

    const trimmed = fileUrl.trim();

    // Check for dangerous protocols
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:text/html') ||
      trimmed.startsWith('vbscript:')
    ) {
      throw new ForbiddenException('Invalid media protocol');
    }

    // Decode recursively (up to 5 times) to check for multi-level url-encoding attacks
    let decoded = trimmed;
    let iterations = 0;
    try {
      let prev = '';
      while (decoded !== prev && iterations < 5) {
        prev = decoded;
        decoded = decodeURIComponent(decoded);
        iterations++;
      }
    } catch {
      throw new BadRequestException('Malformed media URL encoding');
    }

    // Security Check: Path traversal prevention
    if (
      decoded.includes('..') ||
      decoded.includes('\\') ||
      trimmed.includes('..') ||
      trimmed.includes('\\')
    ) {
      throw new ForbiddenException('Invalid file key: path traversal detected');
    }

    let key = '';
    let isS3 = false;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        throw new BadRequestException('Malformed media URL');
      }

      const hostname = parsed.hostname.toLowerCase();
      const isS3Domain =
        hostname.endsWith('.amazonaws.com') || hostname === 's3.amazonaws.com';
      const hasCommunityPrefix =
        parsed.pathname.includes('/community/uploads/') ||
        parsed.pathname.startsWith('/community/uploads');

      if (isS3Domain || hasCommunityPrefix) {
        isS3 = true;
        // Verify bucket match if pointing to an S3 domain
        if (isS3Domain) {
          const expectedBucket = this.s3Service.bucketName?.toLowerCase();
          if (expectedBucket) {
            const bucketInSubdomain = hostname.startsWith(`${expectedBucket}.`);
            const bucketInPath = parsed.pathname.startsWith(`/${expectedBucket}/`);
            if (!bucketInSubdomain && !bucketInPath) {
              throw new ForbiddenException(
                'Media URL does not match authorized S3 bucket',
              );
            }
            if (bucketInPath) {
              parsed.pathname = parsed.pathname.slice(expectedBucket.length + 1);
            }
          }
        }
        key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
      } else {
        // External non-S3 URL (e.g. allowed mock/testing URLs)
        return trimmed;
      }
    } else {
      // Relative key
      key = decodeURIComponent(trimmed.replace(/^\/+/, ''));
      isS3 = true;
    }

    if (isS3) {
      // Disallow empty key or root
      if (
        !key ||
        key === '/' ||
        key === 'community/uploads' ||
        key === 'community/uploads/'
      ) {
        throw new ForbiddenException('Invalid S3 key: root access is forbidden');
      }

      // Security Check: Enforce that the target key resides in community/uploads/
      if (!key.startsWith('community/uploads/')) {
        throw new ForbiddenException(
          'Target resource is not in authorized community uploads directory',
        );
      }

      // Security Check (IDOR prevention): Key MUST start with community/uploads/<userId>/ unless admin
      const expectedPrefix = `community/uploads/${userId}/`;
      if (!isAdmin && !key.startsWith(expectedPrefix)) {
        this.logger.warn(
          `Security violation: User ${userId} attempted to access S3 object '${key}' belonging to another entity`,
        );
        throw new ForbiddenException(
          'You are not authorized to use or delete this media',
        );
      }
    }

    return key;
  }

  async deleteCommunityMedia(
    fileUrl: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    if (!fileUrl) {
      throw new BadRequestException('File URL is required');
    }

    try {
      const key = this.validateMediaOwnership(fileUrl, userId, isAdmin);

      const command = new DeleteObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: key,
      });

      await this.s3Service.s3Client.send(command);
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to delete S3 media ${fileUrl}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete media from storage');
    }
  }
}
