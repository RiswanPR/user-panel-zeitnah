import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommunityMediaJob,
  CommunityMediaJobDocument,
} from '../schemas/media-job.schema';
import { CommunityVideoProcessorService } from './community-video-processor.service';
import { CommunityMusicService } from './community-music.service';
import { CommunityStickerService } from './community-sticker.service';
import { renderTextLayerPng, renderStickerPng } from './community-overlay-rasterizer';
import { S3Service } from '../../../common/aws/s3.service';
import { SignedUrlService } from '../../../common/aws/signed-url.service';
import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pipeline } from 'stream/promises';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class CommunityMediaJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunityMediaJobService.name);
  private readonly workerId = `worker-${uuidv4().slice(0, 8)}`;
  private activeJobsCount = 0;
  public readonly MAX_CONCURRENT_JOBS = 2;
  public readonly MAX_CLUSTER_CONCURRENT_JOBS = Number(process.env.COMMUNITY_MAX_CLUSTER_CONCURRENT_JOBS) || 2;
  public readonly STALE_THRESHOLD_MS = Number(process.env.COMMUNITY_STALE_JOB_THRESHOLD_MS) || 2 * 60 * 1000; // 2 minutes with active 15s heartbeats
  private isShuttingDown = false;

  constructor(
    @InjectModel(CommunityMediaJob.name)
    private readonly jobModel: Model<CommunityMediaJobDocument>,
    private readonly videoProcessor: CommunityVideoProcessorService,
    private readonly s3Service: S3Service,
    @Optional() private readonly signedUrlService?: SignedUrlService,
    @Optional() private readonly musicService?: CommunityMusicService,
    @Optional() private readonly stickerService?: CommunityStickerService,
  ) {}

  onModuleInit() {
    this.logger.log(`Community media worker initialized [${this.workerId}]`);
    // Run an initial recovery sweep on startup
    this.recoverStaleJobs().catch((err) => {
      this.logger.warn(`Startup stale job recovery error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
  }

  /**
   * Periodic scheduler tick (every 5 seconds) to claim QUEUED jobs and recover stale processing jobs.
   */
  @Interval(5000)
  async handleWorkerInterval(): Promise<void> {
    if (this.isShuttingDown) return;
    try {
      await this.recoverStaleJobs();
      await this.processNextJobs();
    } catch (err: any) {
      this.logger.error(`Error in media worker tick: ${err.message}`, err.stack);
    }
  }

  /**
   * Wakes worker immediately when a new job is created or retried.
   */
  triggerWorker(): void {
    setImmediate(() => {
      this.processNextJobs().catch((err) => {
        this.logger.warn(`Worker trigger error: ${err.message}`);
      });
    });
  }

  /**
   * Creates a new video processing job in QUEUED status and stores source reference.
   */
  async createJob(params: {
    userId: string;
    sourceKey: string;
    sourceUrl: string;
    mimeType: string;
    sourceSize: number;
    sourceDuration?: number;
    trimStart?: number;
    trimEnd?: number;
    customCoverUrl?: string;
    audioConfig?: any;
    editorConfig?: any;
  }): Promise<CommunityMediaJobDocument> {
    const mediaId = uuidv4();
    const job = await this.jobModel.create({
      mediaId,
      userId: params.userId,
      sourceKey: params.sourceKey,
      sourceUrl: params.sourceUrl,
      mimeType: params.mimeType,
      sourceSize: params.sourceSize,
      sourceDuration: params.sourceDuration,
      trimStart: Number(params.trimStart) || 0,
      trimEnd: params.trimEnd !== undefined && params.trimEnd !== null ? Number(params.trimEnd) : undefined,
      customCoverUrl: params.customCoverUrl,
      audioConfig: params.audioConfig,
      editorConfig: params.editorConfig,
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 3,
      isPermanentFailure: false,
    });

    this.logger.log(
      `MEDIA_JOB_CREATED: MediaId="${mediaId}", JobId="${job._id}", UserId="${params.userId}", Trim=[${job.trimStart}-${job.trimEnd || 'end'}]`,
    );

    this.triggerWorker();
    return job;
  }

  /**
   * Retrieves a job by mediaId.
   */
  async getJobByMediaId(mediaId: string): Promise<CommunityMediaJobDocument | null> {
    if (!mediaId) return null;
    return this.jobModel.findOne({ mediaId });
  }

  /**
   * Safe status check with ownership validation.
   */
  async getJobStatus(
    mediaId: string,
    requestingUserId: string,
    isAdmin = false,
  ): Promise<any> {
    const job = await this.getJobByMediaId(mediaId);
    if (!job) {
      throw new NotFoundException('Media processing job not found');
    }

    if (!isAdmin && job.userId !== requestingUserId) {
      throw new ForbiddenException('You do not have access to this media job');
    }

    return {
      mediaId: job.mediaId,
      jobId: job._id,
      status: job.status,
      progress: null, // Honest: no faked percentage
      playbackUrl: job.outputUrl || null,
      posterUrl: job.posterUrl || job.customCoverUrl || null,
      duration: job.outputDuration || job.sourceDuration || null,
      width: job.outputWidth || null,
      height: job.outputHeight || null,
      error: job.errorMessage || null,
      errorCode: job.errorCode || null,
      isRetryable: !job.isPermanentFailure && job.status === 'FAILED',
    };
  }

  /**
   * Retries a failed job without re-uploading the original media.
   * Completely idempotent: handles rapid double-clicks without resetting active jobs or creating duplicates.
   */
  async retryJob(
    mediaId: string,
    requestingUserId: string,
    isAdmin = false,
    options?: { trimStart?: number; trimEnd?: number; audioConfig?: any; editorConfig?: any },
  ): Promise<CommunityMediaJobDocument> {
    const job = await this.getJobByMediaId(mediaId);
    if (!job) {
      throw new NotFoundException('Media processing job not found');
    }

    if (!isAdmin && job.userId !== requestingUserId) {
      throw new ForbiddenException('You are not authorized to retry this job');
    }

    const hasConfigChanged = Boolean(
      options && (
        (options.trimStart !== undefined && options.trimStart !== job.trimStart) ||
        (options.trimEnd !== undefined && options.trimEnd !== job.trimEnd) ||
        (options.audioConfig !== undefined && JSON.stringify(options.audioConfig) !== JSON.stringify(job.audioConfig)) ||
        (options.editorConfig !== undefined && JSON.stringify(options.editorConfig) !== JSON.stringify(job.editorConfig))
      ),
    );

    if (job.status === 'READY' && !hasConfigChanged) {
      return job;
    }

    // Rapid double-click idempotency: if already in queue or processing and config hasn't changed, return existing job (Section 33)
    if ((job.status === 'QUEUED' || job.status === 'PROCESSING') && !hasConfigChanged) {
      this.triggerWorker();
      return job;
    }

    if (job.isPermanentFailure && !hasConfigChanged) {
      throw new BadRequestException(
        job.errorMessage ||
          'This video cannot be processed due to a permanent media format error. Please choose another video.',
      );
    }

    // Apply any updated trim, audio or editor config
    if (options?.trimStart !== undefined) job.trimStart = Number(options.trimStart) || 0;
    if (options?.trimEnd !== undefined) job.trimEnd = Number(options.trimEnd);
    if (options?.audioConfig !== undefined) job.audioConfig = options.audioConfig;
    if (options?.editorConfig !== undefined) job.editorConfig = options.editorConfig;

    // Reset job state for retry
    job.status = 'QUEUED';
    job.errorCode = undefined;
    job.errorMessage = undefined;
    job.lockedAt = undefined;
    job.lockedBy = undefined;
    job.attempts = 0;

    if (typeof (job as any).save === 'function') {
      await (job as any).save();
    } else {
      await this.jobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'QUEUED',
            errorCode: null,
            errorMessage: null,
            lockedAt: null,
            lockedBy: null,
            attempts: 0,
            trimStart: job.trimStart,
            trimEnd: job.trimEnd,
            audioConfig: job.audioConfig,
            editorConfig: job.editorConfig,
          },
        },
      );
    }

    this.logger.log(`MEDIA_JOB_RETRY_INITIATED: MediaId="${mediaId}", JobId="${job._id}"`);
    this.triggerWorker();
    return job;
  }

  /**
   * Claims and processes queued jobs within the concurrency limit.
   * Checks both local instance limit and cluster-wide limit across multiple instances.
   */
  async processNextJobs(): Promise<void> {
    if (this.isShuttingDown) return;

    const activeThreshold = new Date(Date.now() - this.STALE_THRESHOLD_MS);

    while (this.activeJobsCount < this.MAX_CONCURRENT_JOBS) {
      // Cluster-wide concurrency guard (Sections 7 & 10)
      if (typeof this.jobModel.countDocuments === 'function') {
        const clusterProcessingCount = await this.jobModel.countDocuments({
          status: 'PROCESSING',
          lockedAt: { $gte: activeThreshold },
        });

        if (clusterProcessingCount >= this.MAX_CLUSTER_CONCURRENT_JOBS) {
          break;
        }
      }

      // Atomic claim using findOneAndUpdate
      const job = await this.jobModel.findOneAndUpdate(
        {
          status: 'QUEUED',
          isPermanentFailure: { $ne: true },
          attempts: { $lt: 3 },
        },
        {
          $set: {
            status: 'PROCESSING',
            startedAt: new Date(),
            lockedAt: new Date(),
            lockedBy: this.workerId,
          },
          $inc: { attempts: 1 },
        },
        {
          sort: { createdAt: 1 },
          returnDocument: 'after',
        },
      );

      if (!job) {
        // No more queued jobs
        break;
      }

      this.activeJobsCount++;
      this.logger.log(
        `JOB_CLAIMED: MediaId="${job.mediaId}", JobId="${job._id}", Attempt=${job.attempts}/${job.maxAttempts}, ActiveWorkers=${this.activeJobsCount}/${this.MAX_CONCURRENT_JOBS}`,
      );

      // Execute asynchronously in background
      this.executeJob(job)
        .catch((err) => {
          this.logger.error(`Job execution fatal wrapper error: ${err.message}`, err.stack);
        })
        .finally(() => {
          this.activeJobsCount--;
          this.triggerWorker();
        });
    }
  }

  /**
   * Executes the full media processing pipeline for a claimed job:
   * Disk preflight -> S3 download -> FFprobe -> Trim -> Transcode -> Poster -> S3 upload -> S3 verify -> Mark READY
   */
  private async executeJob(job: CommunityMediaJobDocument): Promise<void> {
    // Temp directory path isolation & sanitization (Section 6)
    const sanitizedJobId = String(job._id).replace(/[^a-zA-Z0-9_-]/g, '');
    const baseDir = path.join(os.tmpdir(), 'zeitnah-community-media');
    const jobDir = path.join(baseDir, sanitizedJobId);

    // Verify path cannot escape baseDir
    if (!path.resolve(jobDir).startsWith(path.resolve(baseDir))) {
      throw new BadRequestException('Invalid workspace directory path');
    }

    const sourceFilePath = path.join(jobDir, 'source.tmp');
    const outputFilePath = path.join(jobDir, 'processed.mp4');
    const posterFilePath = path.join(jobDir, 'poster.jpg');

    const startTime = Date.now();

    // Active worker lease heartbeat (Section 11 & 12)
    const heartbeatTimer = setInterval(async () => {
      try {
        await this.jobModel.updateOne(
          { _id: job._id, lockedBy: this.workerId, status: 'PROCESSING' },
          { $set: { lockedAt: new Date() } },
        );
      } catch (hbErr: any) {
        this.logger.warn(`Heartbeat update failed for Job ${job._id}: ${hbErr.message}`);
      }
    }, 15000);

    try {
      fs.mkdirSync(jobDir, { recursive: true });

      // Preflight Disk Space Safety Check (Section 5)
      try {
        const statFs = fs.statfsSync(jobDir);
        const availableBytes = Number(statFs.bavail) * Number(statFs.bsize);
        const safeSourceSize = Math.max(0, Number(job.sourceSize) || 0);
        const safeLayerCount = Math.max(0, Math.min(Number(job.editorConfig?.layers?.length) || 0, 10));

        const requiredEstimateBytes =
          Math.max(safeSourceSize * 1.5, 100 * 1024 * 1024) +
          150 * 1024 * 1024 +
          safeLayerCount * 5 * 1024 * 1024;

        if (!isNaN(availableBytes) && availableBytes < requiredEstimateBytes) {
          const availMB = (availableBytes / (1024 * 1024)).toFixed(1);
          const reqMB = (requiredEstimateBytes / (1024 * 1024)).toFixed(1);
          this.logger.error(
            `DISK_SPACE_EXHAUSTION_PREVENTED: JobId="${job._id}", AvailableDisk=${availMB}MB, RequiredEstimate=${reqMB}MB. Failing gracefully.`,
          );
          throw new Error('Temporary storage space is temporarily constrained. Please retry in a few moments.');
        }
      } catch (statErr: any) {
        if (statErr.message?.includes('constrained')) throw statErr;
        this.logger.debug?.(`statfs check skipped: ${statErr.message}`);
      }

      // 1. Download source from S3 safely via stream (no memory buffering)
      this.logger.log(`Downloading source from S3 for MediaId="${job.mediaId}", Key="${job.sourceKey}"`);
      const getCommand = new GetObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: job.sourceKey,
      });

      const s3Response = await this.s3Service.s3Client.send(getCommand);
      if (!s3Response.Body) {
        throw new Error('S3 object body is empty or unavailable');
      }

      const fileWriteStream = fs.createWriteStream(sourceFilePath);
      await pipeline(s3Response.Body as any, fileWriteStream);

      const downloadedStat = fs.statSync(sourceFilePath);
      if (downloadedStat.size <= 0) {
        throw new Error('Downloaded source file from S3 is empty');
      }

      // Validate downloaded size against recorded source size if available (Section 4)
      if (job.sourceSize && job.sourceSize > 0 && downloadedStat.size !== job.sourceSize) {
        throw new Error(
          `Downloaded source file size (${downloadedStat.size} bytes) does not match expected size (${job.sourceSize} bytes).`,
        );
      }

      // 2. Resolve and download music asset via streaming if audioConfig specifies a music track
      let musicLocalPath: string | undefined;
      const audioConfig = job.audioConfig;

      if (
        audioConfig?.musicId &&
        (audioConfig.audioMode === 'MUSIC_ONLY' || audioConfig.audioMode === 'MIXED')
      ) {
        let musicTrack: any = null;
        if (this.musicService) {
          try {
            musicTrack = await this.musicService.getTrackById(audioConfig.musicId);
          } catch (mErr: any) {
            this.logger.warn(`Could not resolve musicId ${audioConfig.musicId}: ${mErr.message}`);
          }
        }

        if (musicTrack?.audioKey) {
          // If local audioKey exists on disk (e.g. test fixtures)
          if (fs.existsSync(musicTrack.audioKey)) {
            musicLocalPath = musicTrack.audioKey;
          } else {
            // Stream music asset from S3 into temp workspace (zero heap buffering, Section 32)
            const musicExt = path.extname(musicTrack.audioKey) || '.mp3';
            const tempMusicPath = path.join(jobDir, `music${musicExt}`);
            try {
              const musicGetCmd = new GetObjectCommand({
                Bucket: this.s3Service.bucketName,
                Key: musicTrack.audioKey,
              });
              const musicS3Res = await this.s3Service.s3Client.send(musicGetCmd);
              if (musicS3Res.Body) {
                const musicWriteStream = fs.createWriteStream(tempMusicPath);
                await pipeline(musicS3Res.Body as any, musicWriteStream);
                if (fs.existsSync(tempMusicPath) && fs.statSync(tempMusicPath).size > 0) {
                  musicLocalPath = tempMusicPath;
                }
              }
            } catch (s3MusicErr: any) {
              this.logger.warn(
                `Failed to stream music key "${musicTrack.audioKey}" from S3: ${s3MusicErr.message}`,
              );
            }
          }
        }
      }

      // 2b. Phase 3D: Resolve and render multi-layer overlay assets (Text, Stickers, Captions)
      const overlayAssets: Array<{
        layerId: string;
        localPath: string;
        x: number;
        y: number;
        scale?: number;
        rotation?: number;
        opacity?: number;
        start: number;
        end: number;
      }> = [];

      const editorLayers = job.editorConfig?.layers || [];
      if (Array.isArray(editorLayers) && editorLayers.length > 0) {
        const safeLayers = editorLayers.slice(0, 10);
        for (const layer of safeLayers) {
          if (!layer || !layer.id) continue;
          const sanitizedId = String(layer.id).replace(/[^a-zA-Z0-9_-]/g, '');
          const layerPngPath = path.join(jobDir, `overlay_${sanitizedId}.png`);

          if (layer.type === 'STICKER' && layer.stickerId) {
            if (this.stickerService) {
              try {
                const asset = this.stickerService.resolveStickerAsset(layer.stickerId, jobDir);
                if (asset && fs.existsSync(asset.filePath)) {
                  overlayAssets.push({
                    layerId: layer.id,
                    localPath: asset.filePath,
                    x: Math.max(0, Math.min(Number(layer.x ?? 0.5), 1.0)),
                    y: Math.max(0, Math.min(Number(layer.y ?? 0.5), 1.0)),
                    scale: layer.scale !== undefined ? Number(layer.scale) : 1.0,
                    rotation: layer.rotation !== undefined ? Number(layer.rotation) : 0,
                    opacity: layer.opacity !== undefined ? Number(layer.opacity) : 1.0,
                    start: Number(layer.start ?? 0),
                    end: Number(layer.end ?? 30),
                  });
                }
              } catch (stkErr: any) {
                this.logger.warn(`Failed to resolve sticker ${layer.stickerId}: ${stkErr.message}`);
              }
            } else {
              try {
                renderStickerPng(layer.stickerId, layerPngPath);
                if (fs.existsSync(layerPngPath)) {
                  overlayAssets.push({
                    layerId: layer.id,
                    localPath: layerPngPath,
                    x: Math.max(0, Math.min(Number(layer.x ?? 0.5), 1.0)),
                    y: Math.max(0, Math.min(Number(layer.y ?? 0.5), 1.0)),
                    scale: layer.scale !== undefined ? Number(layer.scale) : 1.0,
                    rotation: layer.rotation !== undefined ? Number(layer.rotation) : 0,
                    opacity: layer.opacity !== undefined ? Number(layer.opacity) : 1.0,
                    start: Number(layer.start ?? 0),
                    end: Number(layer.end ?? 30),
                  });
                }
              } catch (stkErr: any) {
                this.logger.warn(`Failed to render sticker ${layer.stickerId}: ${stkErr.message}`);
              }
            }
          } else if (layer.type === 'TEXT' || layer.type === 'CAPTION') {
            try {
              renderTextLayerPng(layer, layerPngPath);
              if (fs.existsSync(layerPngPath)) {
                overlayAssets.push({
                  layerId: layer.id,
                  localPath: layerPngPath,
                  x: Math.max(0, Math.min(Number(layer.x ?? 0.5), 1.0)),
                  y: Math.max(0, Math.min(Number(layer.y ?? 0.5), 1.0)),
                  scale: layer.scale !== undefined ? Number(layer.scale) : 1.0,
                  rotation: layer.rotation !== undefined ? Number(layer.rotation) : 0,
                  opacity: layer.opacity !== undefined ? Number(layer.opacity) : 1.0,
                  start: Number(layer.start ?? 0),
                  end: Number(layer.end ?? 30),
                });
              }
            } catch (txtErr: any) {
              this.logger.warn(`Failed to render text overlay ${layer.id}: ${txtErr.message}`);
            }
          }
        }
      }

      // 3. FFprobe validation & real server-side trim + H.264/AAC transcode with audio mixing + overlays + poster generation
      this.logger.log(
        `Executing video transcode & trim for MediaId="${job.mediaId}", Size=${downloadedStat.size}, AudioMode=${audioConfig?.audioMode || 'ORIGINAL_ONLY'}, HasMusic=${Boolean(musicLocalPath)}, Overlays=${overlayAssets.length}`,
      );

      const transcodeResult = await this.videoProcessor.processVideo(
        sourceFilePath,
        outputFilePath,
        posterFilePath,
        {
          trimStart: job.trimStart,
          trimEnd: job.trimEnd,
          overlayAssets: overlayAssets.length > 0 ? overlayAssets : undefined,
          audioConfig: musicLocalPath
            ? {
                audioMode: audioConfig?.audioMode,
                musicPath: musicLocalPath,
                musicStart: audioConfig?.sourceStart,
                musicEnd: audioConfig?.sourceEnd,
                originalVolume: audioConfig?.originalVolume,
                musicVolume: audioConfig?.musicVolume,
              }
            : audioConfig
              ? {
                  audioMode: audioConfig.audioMode,
                  originalVolume: audioConfig.originalVolume,
                  musicVolume: audioConfig.musicVolume,
                }
              : undefined,
        },
      );

      // 3. Upload processed video to S3
      const processedKey = `community/processed/${job.userId}/${job.mediaId}.mp4`;
      const processedSize = fs.statSync(outputFilePath).size;

      const putVideoCommand = new PutObjectCommand({
        Bucket: this.s3Service.bucketName,
        Key: processedKey,
        Body: fs.createReadStream(outputFilePath),
        ContentType: 'video/mp4',
        ContentLength: processedSize,
      });
      await this.s3Service.s3Client.send(putVideoCommand);

      // 4. Upload poster to S3
      const posterKey = `community/posters/${job.userId}/${job.mediaId}.jpg`;
      let posterSize = 0;
      if (fs.existsSync(posterFilePath)) {
        posterSize = fs.statSync(posterFilePath).size;
        const putPosterCommand = new PutObjectCommand({
          Bucket: this.s3Service.bucketName,
          Key: posterKey,
          Body: fs.createReadStream(posterFilePath),
          ContentType: 'image/jpeg',
          ContentLength: posterSize,
        });
        await this.s3Service.s3Client.send(putPosterCommand);
      }

      // 5. Output Verification on S3 (Section 30)
      const videoHead = await this.s3Service.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.s3Service.bucketName,
          Key: processedKey,
        }),
      );
      if (videoHead && videoHead.ContentLength !== undefined && videoHead.ContentLength <= 0) {
        throw new Error('Verified S3 video object is empty (0 bytes).');
      }

      if (posterKey && posterSize > 0) {
        const posterHead = await this.s3Service.s3Client.send(
          new HeadObjectCommand({
            Bucket: this.s3Service.bucketName,
            Key: posterKey,
          }),
        );
        if (posterHead && posterHead.ContentLength !== undefined && posterHead.ContentLength <= 0) {
          throw new Error('Verified S3 poster object is empty (0 bytes).');
        }
      }

      // 6. Generate signed or public URLs
      let playbackUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${processedKey}`;
      let posterUrl = `https://${this.s3Service.bucketName}.s3.${this.s3Service.region}.amazonaws.com/${posterKey}`;

      if (this.signedUrlService) {
        try {
          const signedVideo = await this.signedUrlService.generateSignedVideoUrl(
            processedKey,
            86400 * 7,
          );
          if (signedVideo) playbackUrl = signedVideo;

          const signedPoster = await this.signedUrlService.generateSignedImageUrl(
            posterKey,
            86400 * 7,
          );
          if (signedPoster) posterUrl = signedPoster;
        } catch (signErr: any) {
          this.logger.warn(`Could not presign processed URLs: ${signErr.message}`);
        }
      }

      // 7. Update Job State to READY
      const durationMs = Date.now() - startTime;
      await this.jobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'READY',
            outputKey: processedKey,
            outputUrl: playbackUrl,
            posterKey,
            posterUrl,
            outputDuration: transcodeResult.duration,
            outputWidth: transcodeResult.width,
            outputHeight: transcodeResult.height,
            outputSize: processedSize,
            completedAt: new Date(),
            errorCode: null,
            errorMessage: null,
            lockedAt: null,
            lockedBy: null,
          },
        },
      );

      this.logger.log(
        `JOB_SUCCEEDED: MediaId="${job.mediaId}", JobId="${job._id}", Duration=${transcodeResult.duration.toFixed(2)}s, ProcessingTime=${durationMs}ms, OutSize=${processedSize}`,
      );
    } catch (err: any) {
      const isPermanent =
        err instanceof BadRequestException ||
        err?.code === 'INVALID_VIDEO' ||
        err?.code === 'NO_VIDEO_STREAM' ||
        err?.code === 'VIDEO_TOO_LONG' ||
        err?.code === 'INVALID_TRIM_RANGE' ||
        err?.code === 'TRIM_TOO_SHORT' ||
        err?.code === 'TRIM_TOO_LONG' ||
        err?.code === 'FILE_TOO_LARGE' ||
        err?.name === 'NoSuchKey';

      const friendlyMessage =
        err?.response?.message ||
        err?.message ||
        'Video processing encountered an unexpected error.';

      const willRetry = !isPermanent && job.attempts < job.maxAttempts;

      await this.jobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            status: willRetry ? 'QUEUED' : 'FAILED',
            errorCode: isPermanent
              ? 'PERMANENT_MEDIA_ERROR'
              : willRetry
              ? 'TRANSIENT_ERROR'
              : 'MAX_ATTEMPTS_EXCEEDED',
            errorMessage: friendlyMessage,
            isPermanentFailure: isPermanent,
            lockedAt: null,
            lockedBy: null,
          },
        },
      );

      this.logger.error(
        `JOB_FAILED: MediaId="${job.mediaId}", JobId="${job._id}", Attempt=${job.attempts}/${job.maxAttempts}, Permanent=${isPermanent}, WillRetry=${willRetry}: ${err.message}`,
        err.stack,
      );
    } finally {
      clearInterval(heartbeatTimer);
      // Clean up temporary workspace directory completely
      try {
        if (fs.existsSync(jobDir)) {
          fs.rmSync(jobDir, { recursive: true, force: true });
        }
      } catch (cleanErr: any) {
        this.logger.warn(`Failed to clean up job temp dir ${jobDir}: ${cleanErr.message}`);
      }
    }
  }

  /**
   * Recovers jobs that were stuck in PROCESSING beyond the stale threshold
   * (e.g. following process kill, worker death, or PM2 restart).
   */
  async recoverStaleJobs(): Promise<void> {
    const STALE_THRESHOLD_MS = this.STALE_THRESHOLD_MS;
    const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

    // Stale jobs with attempts remaining -> reset to QUEUED
    const recovered = await this.jobModel.updateMany(
      {
        status: 'PROCESSING',
        lockedAt: { $lt: staleCutoff },
        attempts: { $lt: 3 },
      },
      {
        $set: {
          status: 'QUEUED',
          lockedAt: null,
          lockedBy: null,
          errorMessage: 'Job was reset to queue after worker timeout.',
        },
      },
    );

    if (recovered.modifiedCount > 0) {
      this.logger.warn(
        `STALE_JOBS_RECOVERED: Reset ${recovered.modifiedCount} stale jobs back to QUEUED`,
      );
    }

    // Stale jobs that exceeded max attempts -> mark FAILED
    const failed = await this.jobModel.updateMany(
      {
        status: 'PROCESSING',
        lockedAt: { $lt: staleCutoff },
        attempts: { $gte: 3 },
      },
      {
        $set: {
          status: 'FAILED',
          errorCode: 'TIMEOUT_EXCEEDED',
          errorMessage: 'Video processing timed out and exceeded maximum retries.',
          lockedAt: null,
          lockedBy: null,
        },
      },
    );

    if (failed.modifiedCount > 0) {
      this.logger.warn(
        `STALE_JOBS_EXHAUSTED: Marked ${failed.modifiedCount} timed-out jobs as FAILED`,
      );
    }
  }
}

