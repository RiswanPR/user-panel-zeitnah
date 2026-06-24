import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { SignedUrlService } from './signed-url.service';
import { VideoService } from './video.service';
import { ImageService } from './image.service';
import { UploadService } from './upload.service';
import { MediaService } from './media.service';

@Module({
  providers: [
    S3Service,
    SignedUrlService,
    VideoService,
    ImageService,
    UploadService,
    MediaService,
  ],
  exports: [
    S3Service,
    SignedUrlService,
    VideoService,
    ImageService,
    UploadService,
    MediaService,
  ],
})
export class AwsModule {}
