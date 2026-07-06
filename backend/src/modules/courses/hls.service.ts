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

const execPromise = promisify(exec);

@Injectable()
export class HlsService {
  private readonly logger = new Logger(HlsService.name);

  constructor(
    private s3Service: S3Service,
    private signedUrlService: SignedUrlService,
  ) {}

  /**
   * Convert an existing MP4 file in S3 to HLS format and upload back to S3.
   * This is a heavy process and should be called asynchronously.
   */
  async convertVideoToHls(
    objectKey: string,
  ): Promise<{ success: boolean; hlsPath?: string; error?: any }> {
    this.logger.log(`Starting HLS conversion for ${objectKey}`);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
    const inputFilePath = path.join(tempDir, 'input.mp4');
    const outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      // 1. Download from S3
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
      // Ensure the body is a stream before piping (Node.js environment)
      if (typeof (response.Body as any).pipe === 'function') {
        await new Promise((resolve, reject) => {
          (response.Body as any)
            .pipe(writeStream)
            .on('error', reject)
            .on('finish', resolve);
        });
      } else {
        const bodyArr = await response.Body.transformToByteArray();
        fs.writeFileSync(inputFilePath, bodyArr);
      }

      // 2. Convert to HLS using FFmpeg
      this.logger.log(`Converting ${inputFilePath} to HLS`);
      const hlsPrefix =
        objectKey.substring(0, objectKey.lastIndexOf('.')) || objectKey;
      const m3u8Filename = 'playlist.m3u8';
      const outputM3u8Path = path.join(outputDir, m3u8Filename);

      // Simple FFmpeg command for HLS
      // In production, you might want multiple resolutions. Here we use source resolution.
      const ffmpegCmd = `ffmpeg -i "${inputFilePath}" -profile:v baseline -level 3.0 -s 1280x720 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "${outputM3u8Path}"`;

      await execPromise(ffmpegCmd);
      this.logger.log(`HLS conversion completed in ${outputDir}`);

      // 3. Upload all generated files back to S3
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const s3Key = `hls/${hlsPrefix}/${file}`;

        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8'))
          contentType = 'application/vnd.apple.mpegurl';
        else if (file.endsWith('.ts')) contentType = 'video/MP2T';

        const fileBuffer = fs.readFileSync(filePath);

        const putCommand = new PutObjectCommand({
          Bucket: this.s3Service.bucketName,
          Key: s3Key,
          Body: fileBuffer,
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
      // Attempt cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
      return { success: false, error };
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

            // Generate a signed URL for this segment valid for 15 minutes
            const signedUrl =
              await this.signedUrlService.generateSignedVideoUrl(
                segmentKey,
                900,
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
