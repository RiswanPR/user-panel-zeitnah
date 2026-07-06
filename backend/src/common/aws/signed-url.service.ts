import { Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Service } from './s3.service';

@Injectable()
export class SignedUrlService {
  private readonly logger = new Logger(SignedUrlService.name);

  constructor(private s3Service: S3Service) {}

  private getConfiguredBucketObjectKey(value: string): string | null {
    const trimmedValue = value.trim();
    const bucketName = this.s3Service.bucketName;

    if (trimmedValue.toLowerCase().startsWith('s3://')) {
      const withoutScheme = trimmedValue.slice(5);
      const slashIndex = withoutScheme.indexOf('/');
      const bucket = slashIndex >= 0 ? withoutScheme.slice(0, slashIndex) : '';

      if (bucket.toLowerCase() !== bucketName.toLowerCase()) {
        return null;
      }

      return withoutScheme.slice(slashIndex + 1);
    }

    if (!/^https?:\/\//i.test(trimmedValue)) {
      return trimmedValue.replace(/^\/+/, '');
    }

    try {
      const url = new URL(trimmedValue);
      const hostname = url.hostname.toLowerCase();
      const normalisedBucket = bucketName.toLowerCase();
      const virtualHostedBucket =
        hostname === `${normalisedBucket}.s3.amazonaws.com` ||
        hostname.startsWith(`${normalisedBucket}.s3.`);
      const pathStyleS3Host =
        hostname === 's3.amazonaws.com' || hostname.startsWith('s3.');
      let pathname = url.pathname.replace(/^\/+/, '');

      if (virtualHostedBucket) {
        return decodeURIComponent(pathname);
      }

      if (
        pathStyleS3Host &&
        pathname.toLowerCase().startsWith(`${normalisedBucket}/`)
      ) {
        pathname = pathname.slice(bucketName.length + 1);
        return decodeURIComponent(pathname);
      }
    } catch {
      return null;
    }

    return null;
  }

  async generateSignedImageUrl(
    objectKey: string,
    expiresIn = 3600,
  ): Promise<string> {
    if (!objectKey) return '';
    // If it's already a full URL, return it
    if (/^https?:\/\//i.test(objectKey)) return objectKey;

    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: objectKey,
      });
      return await getSignedUrl(this.s3Service.s3Client, command, {
        expiresIn,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to generate signed URL for image: ${objectKey}. Falling back to public URL.`,
      );
      return `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${objectKey}`;
    }
  }

  async generateSignedVideoUrl(
    objectKey: string,
    expiresIn = 900,
  ): Promise<string> {
    if (!objectKey) return '';
    const resolvedObjectKey = this.getConfiguredBucketObjectKey(objectKey);

    if (!resolvedObjectKey) {
      return objectKey;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: resolvedObjectKey,
      });
      return await getSignedUrl(this.s3Service.s3Client, command, {
        expiresIn,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to generate signed URL for video: ${resolvedObjectKey}. Falling back to public URL.`,
      );
      return `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${resolvedObjectKey}`;
    }
  }
}
