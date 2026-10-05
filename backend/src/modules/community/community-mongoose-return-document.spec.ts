/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { CommunityMediaJobService } from './services/community-media-job.service';
import { CommunityMediaJob } from './schemas/media-job.schema';
import { PostRepository } from './repositories/mongo-post.repository';
import { CommunityIdempotencyService } from './services/community-idempotency.service';
import { S3Service } from '../../common/aws/s3.service';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { CommunityVideoProcessorService } from './services/community-video-processor.service';

describe('Mongoose `new` Option Deprecation Migration Suite', () => {
  let emitWarningSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    emitWarningSpy = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
  });

  afterEach(() => {
    emitWarningSpy.mockRestore();
  });

  // =========================================================================
  // 1. Mongoose Deprecation Semantics & Warning Prevention
  // =========================================================================
  describe('1. Mongoose Deprecation Semantics & Warning Prevention', () => {
    it('produces ZERO deprecation warnings when returnDocument: "after" is configured on findOneAndUpdate', async () => {
      const testSchema = new mongoose.Schema(
        { name: String, counter: Number },
        { bufferCommands: false },
      );
      const TestModel: any =
        mongoose.models.TestMongooseReturnDocAfter ||
        mongoose.model('TestMongooseReturnDocAfter', testSchema);

      const query = TestModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId() },
        { $inc: { counter: 1 } },
        { returnDocument: 'after' },
      );

      const options = query.getOptions();
      expect(options.returnDocument).toBe('after');
      expect((options as any).new).toBeUndefined();

      // Trigger Mongoose internal query preparation & option validation
      try {
        await query.exec();
      } catch (err) {
        // Disconnected bufferCommands:false error is expected; options parsing already executed
      }

      expect(emitWarningSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('the `new` option for `findOneAndUpdate()` and `findOneAndReplace()` is deprecated'),
        expect.anything(),
      );
    });

    it('confirms Mongoose emits the deprecation warning if legacy new: true is used (verifying warning detector)', async () => {
      const testSchema = new mongoose.Schema(
        { name: String, counter: Number },
        { bufferCommands: false },
      );
      const TestModel: any =
        mongoose.models.TestMongooseReturnDocLegacy ||
        mongoose.model('TestMongooseReturnDocLegacy', testSchema);

      const query = TestModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId() },
        { $inc: { counter: 1 } },
        { new: true } as any,
      );

      try {
        await query.exec();
      } catch (err) {
        // Disconnected bufferCommands:false error is expected
      }

      expect(emitWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('the `new` option for `findOneAndUpdate()` and `findOneAndReplace()` is deprecated'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // 2. Atomic Community Media Worker Claim Operation
  // =========================================================================
  describe('2. Community Media Worker Atomic Claim Migration', () => {
    let jobService: CommunityMediaJobService;

    const mockJobModel: any = {
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CommunityMediaJobService,
          { provide: getModelToken(CommunityMediaJob.name), useValue: mockJobModel },
          {
            provide: CommunityVideoProcessorService,
            useValue: { probeMedia: jest.fn(), processVideo: jest.fn() },
          },
          {
            provide: S3Service,
            useValue: { s3Client: { send: jest.fn() }, bucketName: 'test', region: 'us-east-1' },
          },
          {
            provide: SignedUrlService,
            useValue: { generateSignedVideoUrl: jest.fn(), generateSignedImageUrl: jest.fn() },
          },
        ],
      }).compile();

      jobService = module.get<CommunityMediaJobService>(CommunityMediaJobService);
    });

    it('claims queued job with returnDocument: "after" and sort: { createdAt: 1 } without deprecated new option', async () => {
      const claimedJob = {
        _id: 'job-return-doc-1',
        mediaId: 'media-return-doc-1',
        userId: 'user-worker-1',
        status: 'PROCESSING',
        attempts: 1,
        sourceKey: 'community/originals/user-worker-1/vid.mp4',
      };

      mockJobModel.findOneAndUpdate
        .mockResolvedValueOnce(claimedJob)
        .mockResolvedValueOnce(null);

      const executeSpy = jest.spyOn<any, any>(jobService, 'executeJob').mockResolvedValue(undefined);

      await jobService.processNextJobs();

      expect(mockJobModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          status: 'QUEUED',
          isPermanentFailure: { $ne: true },
          attempts: { $lt: 3 },
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'PROCESSING',
          }),
          $inc: { attempts: 1 },
        }),
        {
          sort: { createdAt: 1 },
          returnDocument: 'after',
        },
      );

      // Verify exact options: must have returnDocument: 'after' and NOT 'new'
      const calledOptions = mockJobModel.findOneAndUpdate.mock.calls[0][2];
      expect(calledOptions.returnDocument).toBe('after');
      expect(calledOptions.new).toBeUndefined();
      expect(calledOptions.sort).toEqual({ createdAt: 1 });

      // Verifies that the post-update claimed document is what gets passed to executeJob
      expect(executeSpy).toHaveBeenCalledWith(claimedJob);
    });
  });

  // =========================================================================
  // 3. PostRepository Repost Revival Atomic Operation
  // =========================================================================
  describe('3. PostRepository Atomic Repost Revival & Stats Migration', () => {
    let postRepo: PostRepository;

    const mockPostModel: any = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const mockReactionModel: any = {
      findOne: jest.fn(),
      deleteOne: jest.fn(),
      save: jest.fn(),
    };

    beforeEach(() => {
      postRepo = new PostRepository(
        mockPostModel,
        {} as any, // commentModel
        mockReactionModel,
        {} as any, // savedPostModel
        {} as any, // pollOptionModel
        {} as any, // pollVoteModel
      );
    });

    it('revives soft-deleted repost with returnDocument: "after" and runValidators: true', async () => {
      const softDeletedId = new mongoose.Types.ObjectId();
      const mockSoftDeleted = {
        _id: softDeletedId,
        authorId: 'reposter-1',
        originalPostId: 'original-1',
        isDeleted: true,
      };

      const mockRevived = {
        _id: softDeletedId,
        authorId: 'reposter-1',
        originalPostId: 'original-1',
        isDeleted: false,
        type: 'TEXT',
        audience: 'PUBLIC',
      };

      // Mock findOne to return the soft-deleted doc
      mockPostModel.findOne.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue(mockSoftDeleted),
        }),
      });

      // Mock findOneAndUpdate to return the revived post
      mockPostModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRevived),
      });

      const result = await postRepo.createRepost({
        originalPostId: 'original-1',
        authorId: 'reposter-1',
        audience: 'public',
      });

      expect(result).toEqual(mockRevived);
      expect(mockPostModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: softDeletedId },
        expect.objectContaining({
          $set: expect.objectContaining({
            isDeleted: false,
            type: 'TEXT',
            audience: 'PUBLIC',
          }),
        }),
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

      const calledOptions = mockPostModel.findOneAndUpdate.mock.calls[0][2];
      expect(calledOptions.returnDocument).toBe('after');
      expect(calledOptions.runValidators).toBe(true);
      expect(calledOptions.new).toBeUndefined();
    });

    it('updates post reactions using returnDocument: "after" and returns updated stats', async () => {
      const postId = new mongoose.Types.ObjectId().toString();
      const userId = 'user-liker-1';

      mockPostModel.findById.mockResolvedValue({
        _id: postId,
        stats: { likes: 5 },
      });

      // Existing reaction of same type -> toggle off (unlike)
      mockReactionModel.findOne.mockResolvedValue({
        _id: 'rx-1',
        postId,
        userId,
        type: 'like',
      });

      const updatedPost = {
        _id: postId,
        stats: { likes: 4 },
      };
      mockPostModel.findByIdAndUpdate.mockResolvedValue(updatedPost);

      const result = await postRepo.addReaction(postId, userId, 'like');

      expect(result.success).toBe(true);
      expect(result.action).toBe('removed');
      expect(result.stats).toEqual({ likes: 4 });

      expect(mockPostModel.findByIdAndUpdate).toHaveBeenCalledWith(
        postId,
        { $inc: { 'stats.likes': -1 } },
        { returnDocument: 'after' },
      );

      const calledOptions = mockPostModel.findByIdAndUpdate.mock.calls[0][2];
      expect(calledOptions.returnDocument).toBe('after');
      expect(calledOptions.new).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. CommunityIdempotencyService Crash-Safety Stale Lock Reclaim
  // =========================================================================
  describe('4. CommunityIdempotencyService Crash-Safety Stale Lock Reclaim', () => {
    let idempotencyService: CommunityIdempotencyService;

    const mockIdempotencyModel: any = {
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    };

    beforeEach(() => {
      idempotencyService = new CommunityIdempotencyService(mockIdempotencyModel);
    });

    it('reclaims stale pending lock using returnDocument: "after" without deprecated new option', async () => {
      jest.useFakeTimers();
      try {
        const staleId = new mongoose.Types.ObjectId();
        const duplicateError: any = new Error('E11000 duplicate key error');
        duplicateError.code = 11000;

        const payload = { content: 'test post' };
        const fingerprint = idempotencyService.computeFingerprint(
          'user-reclaim-1',
          'CREATE_POST',
          payload,
        );

        // 1. Initial lock fails due to existing record
        mockIdempotencyModel.create.mockRejectedValue(duplicateError);

        // 2. Existing record has matching fingerprint
        mockIdempotencyModel.findOne.mockResolvedValue({
          _id: staleId,
          status: 'PENDING',
          requestFingerprint: fingerprint,
          createdAt: new Date(Date.now() - 30000),
        });

        // 3. Reclaim finds stale record and updates it
        const reclaimedDoc = {
          _id: staleId,
          status: 'PENDING',
          userId: 'user-reclaim-1',
          operation: 'CREATE_POST',
          idempotencyKey: 'key-stale-123',
        };
        mockIdempotencyModel.findOneAndUpdate.mockResolvedValue(reclaimedDoc);

        const mockExecute = jest.fn().mockResolvedValue({ _id: 'new-post-999' });

        const executionPromise = idempotencyService.executeWithIdempotency(
          'user-reclaim-1',
          'CREATE_POST',
          'key-stale-123',
          payload,
          mockExecute,
        );

        // Fast-forward past the 15-second polling loop
        await jest.advanceTimersByTimeAsync(16000);

        const result = await executionPromise;

        expect(result).toEqual({ _id: 'new-post-999' });
        expect(mockIdempotencyModel.findOneAndUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-reclaim-1',
            operation: 'CREATE_POST',
            idempotencyKey: 'key-stale-123',
            status: 'PENDING',
          }),
          expect.objectContaining({
            $set: expect.objectContaining({ updatedAt: expect.any(Date) }),
          }),
          { returnDocument: 'after' },
        );

        const calledOptions = mockIdempotencyModel.findOneAndUpdate.mock.calls[0][2];
        expect(calledOptions.returnDocument).toBe('after');
        expect(calledOptions.new).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
