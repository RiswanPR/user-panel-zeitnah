import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CommunityS3Service } from '../services/community-s3.service';

@ApiTags('Community Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/upload')
export class CommunityUploadController {
  constructor(private readonly s3Service: CommunityS3Service) {}

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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      throw new BadRequestException('File too large (max 50MB)');
    }

    return this.s3Service.uploadCommunityMedia(file, 'community/uploads');
  }

  @Delete()
  @ApiOperation({ summary: 'Delete community media' })
  async deleteFile(@Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }
    await this.s3Service.deleteCommunityMedia(url);
    return { success: true };
  }
}
