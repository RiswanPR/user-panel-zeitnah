import { Injectable, Logger } from '@nestjs/common';
import { ImageService } from './image.service';
import { VideoService } from './video.service';
import { UploadService } from './upload.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private imageService: ImageService,
    private videoService: VideoService,
    private uploadService: UploadService,
  ) {}

  // High-level orchestration for media processing and uploading
}
