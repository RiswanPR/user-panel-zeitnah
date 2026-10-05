import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  PayloadTooLargeException,
  Delete,
  Body,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityS3Service } from '../services/community-s3.service';
import * as multer from 'multer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { Optional } from '@nestjs/common';
import { CommunityMediaJobService } from '../services/community-media-job.service';
import { CommunityMusicService } from '../services/community-music.service';

export const COMMUNITY_UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE: 8 * 1024 * 1024, // 8 MiB (exact binary)
  MAX_VIDEO_SIZE: 1024 * 1024 * 1024, // 1 GiB (exact binary)
  MAX_VIDEO_DURATION_SECONDS: 90, // 90 seconds
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50 MiB
};

const communityDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'zeitnah-community-uploads');
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch {}
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

@ApiTags('Community Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/upload')
export class CommunityUploadController {
  constructor(
    private readonly s3Service: CommunityS3Service,
    @Optional() private readonly mediaJobService?: CommunityMediaJobService,
    @Optional() private readonly musicService?: CommunityMusicService,
  ) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
  }

  private cleanupTempFile(file: any): void {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
    }
  }

  @Post()
  @ApiOperation({ summary: 'Upload community media (images/video/documents)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: communityDiskStorage,
      limits: {
        fileSize: COMMUNITY_UPLOAD_LIMITS.MAX_VIDEO_SIZE, // 1 GiB cap for the upload route
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = this.getUserId(req);
    if (!userId) {
      this.cleanupTempFile(file);
      throw new BadRequestException('Authenticated user required');
    }

    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      this.cleanupTempFile(file);
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    // MIME / Extension consistency check
    if (file.originalname) {
      const extMatch = file.originalname.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch) {
        const ext = '.' + extMatch[1].toLowerCase();
        const DANGEROUS_EXTENSIONS = [
          '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.pl', '.py',
          '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.jar', '.vbs',
        ];
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          this.cleanupTempFile(file);
          throw new BadRequestException('Forbidden file extension detected');
        }

        const MIME_EXTENSION_MAP: Record<string, string[]> = {
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'image/gif': ['.gif'],
          'image/webp': ['.webp'],
          'video/mp4': ['.mp4', '.m4v'],
          'video/webm': ['.webm'],
          'video/quicktime': ['.mov'],
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        };

        const allowedExts = MIME_EXTENSION_MAP[file.mimetype];
        if (allowedExts && !allowedExts.includes(ext)) {
          this.cleanupTempFile(file);
          throw new BadRequestException(
            `File extension ${ext} does not match declared MIME type ${file.mimetype}`,
          );
        }
      }
    }

    // Authoritative upload limits
    if (file.mimetype.startsWith('image/') && file.size > COMMUNITY_UPLOAD_LIMITS.MAX_IMAGE_SIZE) {
      this.cleanupTempFile(file);
      throw new PayloadTooLargeException({
        code: 'FILE_TOO_LARGE',
        message: 'Photo must be 8 MB or smaller.',
      });
    }

    if (file.mimetype.startsWith('video/') && file.size > COMMUNITY_UPLOAD_LIMITS.MAX_VIDEO_SIZE) {
      this.cleanupTempFile(file);
      throw new PayloadTooLargeException({
        code: 'FILE_TOO_LARGE',
        message: 'Video must be 1 GB or smaller.',
      });
    }

    if (
      !file.mimetype.startsWith('image/') &&
      !file.mimetype.startsWith('video/') &&
      file.size > COMMUNITY_UPLOAD_LIMITS.MAX_DOCUMENT_SIZE
    ) {
      this.cleanupTempFile(file);
      throw new PayloadTooLargeException({
        code: 'FILE_TOO_LARGE',
        message: 'File too large (max 50MB)',
      });
    }

    // File signature / magic bytes validation
    try {
      this.validateMagicBytes(file);
    } catch (err) {
      this.cleanupTempFile(file);
      throw err;
    }

    try {
      const uploadResult: any = await this.s3Service.uploadCommunityMedia(file, userId);

      // If video and mediaJobService is available, create asynchronous processing job
      if (file.mimetype.startsWith('video/') && this.mediaJobService) {
        const body = req?.body || {};
        const trimStart = body.trimStart !== undefined && body.trimStart !== '' ? Number(body.trimStart) : undefined;
        const trimEnd = body.trimEnd !== undefined && body.trimEnd !== '' ? Number(body.trimEnd) : undefined;
        const customCoverUrl = typeof body.customCoverUrl === 'string' ? body.customCoverUrl : undefined;

        const sourceKey = uploadResult.key || `community/originals/${userId}/${uploadResult.url.split('/').pop()?.split('?')[0]}`;

        let parsedAudioConfig: any = undefined;
        if (body.audioConfig) {
          try {
            parsedAudioConfig = typeof body.audioConfig === 'string' ? JSON.parse(body.audioConfig) : body.audioConfig;
          } catch {}
        } else if (body.audioMode || body.musicId) {
          parsedAudioConfig = {
            audioMode: body.audioMode,
            musicId: body.musicId,
            sourceStart: body.sourceStart !== undefined && body.sourceStart !== '' ? Number(body.sourceStart) : undefined,
            sourceEnd: body.sourceEnd !== undefined && body.sourceEnd !== '' ? Number(body.sourceEnd) : undefined,
            originalVolume: body.originalVolume !== undefined && body.originalVolume !== '' ? Number(body.originalVolume) : undefined,
            musicVolume: body.musicVolume !== undefined && body.musicVolume !== '' ? Number(body.musicVolume) : undefined,
          };
        }

        if (parsedAudioConfig && this.musicService) {
          parsedAudioConfig = await this.musicService.validateAndResolveAudioConfig(
            parsedAudioConfig,
            req.user?.username,
          );
        }

        let parsedEditorConfig: any = undefined;
        if (body.editorConfig) {
          try {
            parsedEditorConfig =
              typeof body.editorConfig === 'string'
                ? JSON.parse(body.editorConfig)
                : body.editorConfig;
          } catch {}
        }

        const job = await this.mediaJobService.createJob({
          userId,
          sourceKey,
          sourceUrl: uploadResult.url,
          mimeType: uploadResult.mimeType,
          sourceSize: uploadResult.size,
          sourceDuration: uploadResult.duration,
          trimStart,
          trimEnd,
          customCoverUrl,
          audioConfig: parsedAudioConfig,
          editorConfig: parsedEditorConfig,
        });

        return {
          ...uploadResult,
          mediaId: job.mediaId,
          jobId: job._id,
          status: 'QUEUED',
        };
      }

      return {
        ...uploadResult,
        status: 'NOT_REQUIRED',
      };
    } finally {
      this.cleanupTempFile(file);
    }
  }

  /**
   * Validates file signature / magic bytes to distinguish real media from renamed malicious binaries.
   */
  public validateMagicBytes(file: Express.Multer.File | { buffer?: Buffer; path?: string; mimetype: string }): void {
    this.s3Service.validateMagicBytes(file);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete community media' })
  async deleteFile(@Body('url') url: string, @Req() req: any) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }
    const userId = this.getUserId(req);
    const role = req.user?.role || 'student';
    await this.s3Service.deleteCommunityMedia(url, userId, role === 'admin');
    return { success: true, message: 'Media deleted successfully' };
  }
}
