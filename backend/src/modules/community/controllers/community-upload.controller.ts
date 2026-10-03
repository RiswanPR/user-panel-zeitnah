import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
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

@ApiTags('Community Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/upload')
export class CommunityUploadController {
  constructor(private readonly s3Service: CommunityS3Service) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?.id || req.user?._id || '');
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = this.getUserId(req);
    if (!userId) {
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
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    // Authoritative upload limits (Section 6 & 8)
    if (file.mimetype.startsWith('image/') && file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('Image too large (max 15MB)');
    }

    if (file.mimetype.startsWith('video/') && file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('Video too large (max 50MB)');
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB global cap
      throw new BadRequestException('File too large (max 50MB)');
    }

    // MIME / Extension consistency check (Section 10)
    if (file.originalname) {
      const extMatch = file.originalname.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch) {
        const ext = '.' + extMatch[1].toLowerCase();
        const DANGEROUS_EXTENSIONS = [
          '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.pl', '.py',
          '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.jar', '.vbs',
        ];
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
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
          throw new BadRequestException(
            `File extension ${ext} does not match declared MIME type ${file.mimetype}`,
          );
        }
      }
    }

    // File signature / magic bytes validation (Section 5 & 9)
    this.validateMagicBytes(file);

    return this.s3Service.uploadCommunityMedia(file, userId);
  }

  /**
   * Validates file signature / magic bytes to distinguish real media from renamed malicious binaries.
   */
  private validateMagicBytes(file: Express.Multer.File): void {
    if (!file.buffer || file.buffer.length < 4) {
      throw new BadRequestException('Invalid or empty file content');
    }

    const buf = file.buffer;
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
