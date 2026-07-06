import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Service } from '../../../common/aws/s3.service';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommunityS3Service {
  constructor(private readonly s3Service: S3Service) {}

  async uploadCommunityMedia(
    file: Express.Multer.File,
    folder: string = 'community',
  ): Promise<{ url: string; size: number; mimeType: string }> {
    try {
      const fileName = `${folder}/${uuidv4()}-${file.originalname.replace(/\\s+/g, '-')}`;

      const command = new PutObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Or handle appropriately
      });

      await this.s3Service.s3Client.send(command);

      const fileUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${fileName}`;

      return {
        url: fileUrl,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to upload community media to S3',
      );
    }
  }

  async deleteCommunityMedia(fileUrl: string): Promise<void> {
    try {
      const fileName = fileUrl.split('/').slice(3).join('/'); // Extracts the path after the domain
      if (fileName) {
        const command = new DeleteObjectCommand({
          Bucket: this.s3Service.bucketName,
          Key: fileName,
        });
        await this.s3Service.s3Client.send(command);
      }
    } catch (error) {
      console.error(`Failed to delete media ${fileUrl}`, error);
    }
  }
}
