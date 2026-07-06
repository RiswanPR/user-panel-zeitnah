import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from './s3.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private s3Service: S3Service) {}

  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    this.logger.log(`Uploading file to S3: ${key}`);
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const command = new PutObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      await this.s3Service.s3Client.send(command);
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${key}`, error);
      throw error;
    }
  }
}
