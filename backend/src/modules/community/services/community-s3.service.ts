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

@Injectable()
export class CommunityS3Service {
  private readonly logger = new Logger(CommunityS3Service.name);

  constructor(
    private readonly s3Service: S3Service,
    @Optional() private readonly signedUrlService?: SignedUrlService,
  ) {}

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

      let fileUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${fileName}`;
      if (this.signedUrlService) {
        try {
          const signed = await this.signedUrlService.generateSignedImageUrl(fileName, 86400 * 7);
          if (signed) {
            fileUrl = signed;
          }
        } catch (err: any) {
          this.logger.warn(`Could not presign community media URL: ${err.message}`);
        }
      }

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
