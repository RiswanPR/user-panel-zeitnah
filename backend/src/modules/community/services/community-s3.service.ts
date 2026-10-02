import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { S3Service } from '../../../common/aws/s3.service';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommunityS3Service {
  private readonly logger = new Logger(CommunityS3Service.name);

  constructor(private readonly s3Service: S3Service) {}

  async uploadCommunityMedia(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; size: number; mimeType: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required for upload');
    }

    try {
      const sanitizedOriginalName = (file.originalname || 'file')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-60);
      const fileName = `community/uploads/${userId}/${uuidv4()}-${sanitizedOriginalName}`;

      const command = new PutObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Service.s3Client.send(command);

      const fileUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${fileName}`;

      return {
        url: fileUrl,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload media to S3: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Failed to upload community media to storage',
      );
    }
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
      // Extract key from full S3 URL or relative key
      let key = '';
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const parsed = new URL(fileUrl);
        // pathname starts with a slash, e.g. /community/uploads/...
        key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
      } else {
        key = decodeURIComponent(fileUrl.replace(/^\/+/, ''));
      }

      // Security Check: Path traversal prevention
      if (key.includes('..') || key.includes('\\')) {
        throw new ForbiddenException('Invalid file key');
      }

      // Security Check: Enforce that the target key resides in community/uploads/
      if (!key.startsWith('community/uploads/')) {
        throw new ForbiddenException(
          'Target resource is not in authorized community uploads directory',
        );
      }

      // Security Check (IDOR prevention):
      // The key MUST start with community/uploads/<userId>/ unless the user is an admin
      const expectedPrefix = `community/uploads/${userId}/`;
      if (!isAdmin && !key.startsWith(expectedPrefix)) {
        this.logger.warn(
          `Security violation: User ${userId} attempted to delete S3 object '${key}' belonging to another entity`,
        );
        throw new ForbiddenException(
          'You are not authorized to delete this media',
        );
      }

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
