import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../../common/aws/s3.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const execPromise = promisify(exec);

@Injectable()
export class HlsService {
  private readonly logger = new Logger(HlsService.name);
  private readonly activeConversions = new Set<string>();

  constructor(
    private s3Service: S3Service,
    private signedUrlService: SignedUrlService,
  ) {}

  /**
   * Checks whether FFmpeg is available on the system.
   */
  async isFfmpegAvailable(): Promise<boolean> {
    try {
      await execPromise('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert an existing MP4 file in S3 to HLS format and upload back to S3.
   * Uses file-based streaming to ensure multi-GB videos never load into Node.js heap.
   */
  async convertVideoToHls(
    objectKey: string,
  ): Promise<{ success: boolean; hlsPath?: string; error?: any }> {
    // 0. Concurrency and FFmpeg pre-checks
    if (this.activeConversions.has(objectKey)) {
      this.logger.warn(`Conversion already in progress for ${objectKey}`);
      return {
        success: false,
        error: 'A conversion job is already in progress for this video',
      };
    }

    const ffmpegReady = await this.isFfmpegAvailable();
    if (!ffmpegReady) {
      this.logger.error('FFmpeg is not installed or not available in PATH');
      return {
        success: false,
        error: 'FFmpeg is not installed on the server',
      };
    }

    this.activeConversions.add(objectKey);
    this.logger.log(`Starting HLS conversion for ${objectKey}`);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
    const inputFilePath = path.join(tempDir, 'input.mp4');
    const outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      // 1. Download from S3 via streaming pipeline (Zero heap buffering)
      this.logger.log(`Downloading ${objectKey} to ${inputFilePath}`);
      const command = new GetObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: objectKey,
      });
      const response = await this.s3Service.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty body from S3');
      }

      const writeStream = fs.createWriteStream(inputFilePath);
      if (typeof (response.Body as any).pipe === 'function') {
        await pipeline(response.Body as any, writeStream);
      } else if (
        typeof (response.Body as any).transformToWebStream === 'function'
      ) {
        const webStream = (response.Body as any).transformToWebStream();
        await pipeline(Readable.fromWeb(webStream), writeStream);
      } else {
        await pipeline(Readable.from(response.Body as any), writeStream);
      }

      // 2. Convert to HLS using FFmpeg
      this.logger.log(`Converting ${inputFilePath} to HLS`);
      const hlsPrefix =
        objectKey.substring(0, objectKey.lastIndexOf('.')) || objectKey;
      const m3u8Filename = 'playlist.m3u8';
      const outputM3u8Path = path.join(outputDir, m3u8Filename);

      const ffmpegCmd = `ffmpeg -i "${inputFilePath}" -profile:v baseline -level 3.0 -s 1280x720 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "${outputM3u8Path}"`;

      await execPromise(ffmpegCmd);
      this.logger.log(`HLS conversion completed in ${outputDir}`);

      // 3. Upload all generated files back to S3 via streams (Zero heap buffering)
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const s3Key = `hls/${hlsPrefix}/${file}`;

        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (file.endsWith('.ts')) {
          contentType = 'video/MP2T';
        }

        const putCommand = new PutObjectCommand({
          Bucket: this.s3Service.bucketName,
          Key: s3Key,
          Body: fs.createReadStream(filePath),
          ContentType: contentType,
        });

        await this.s3Service.s3Client.send(putCommand);
        this.logger.log(`Uploaded ${file} to ${s3Key}`);
      }

      // 4. Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });

      return { success: true, hlsPath: `hls/${hlsPrefix}/${m3u8Filename}` };
    } catch (error) {
      this.logger.error(`Error converting ${objectKey} to HLS`, error);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
      return { success: false, error };
    } finally {
      this.activeConversions.delete(objectKey);
    }
  }

  /**
   * Fetches the m3u8 playlist from S3, parses it, and replaces every .ts segment
   * with a dynamically generated S3 Signed URL.
   */
  async getSecurePlaylist(objectKey: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: objectKey,
      });
      const response = await this.s3Service.s3Client.send(command);

      if (!response.Body) {
        throw new NotFoundException('Playlist not found');
      }

      const playlistContent = await response.Body.transformToString();
      const lines = playlistContent.split('\n');

      const signedLines = await Promise.all(
        lines.map(async (line) => {
          const trimmed = line.trim();
          // If it's a TS segment relative path
          if (trimmed && !trimmed.startsWith('#') && trimmed.endsWith('.ts')) {
            // Construct the full object key for the segment
            // Assuming segments are in the same directory as the m3u8
            const folderPrefix = objectKey.substring(
              0,
              objectKey.lastIndexOf('/') + 1,
            );
            const segmentKey = folderPrefix + trimmed;

            // Generate a signed URL for this segment valid for 24 hours
            // (playlist is fetched once at load time — outlasts long study sessions)
            const signedUrl =
              await this.signedUrlService.generateSignedVideoUrl(
                segmentKey,
                86400,
              );
            return signedUrl;
          }
          return line;
        }),
      );

      return signedLines.join('\n');
    } catch (error) {
      this.logger.error(
        `Error generating secure playlist for ${objectKey}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to generate secure playlist',
      );
    }
  }
}
