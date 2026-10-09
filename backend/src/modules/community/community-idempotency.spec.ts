/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { CommunityIdempotencyService } from './services/community-idempotency.service';
import { CommunityPublishIdempotency } from './schemas/idempotency.schema';
import { PostService } from './services/post.service';
import { StoryService } from './services/story.service';
import { PostRepository } from './repositories/mongo-post.repository';
import { StoryRepository } from './repositories/mongo-story.repository';
import { CommunityGateway } from './gateways/community.gateway';
import { NotificationsService } from '../notifications/notifications.service';

describe('Phase 4.4: Production Deployment Verification & Durable Server-Side Idempotency', () => {
  let idempotencyService: CommunityIdempotencyService;
  let postService: PostService;
  let storyService: StoryService;

  // In-memory simulated MongoDB collection with compound unique index: (userId, operation, idempotencyKey)
  let dbRecords: any[] = [];

  const mockIdempotencyModel: any = {
    create: jest.fn(async (doc: any) => {
      const exists = dbRecords.find(
        (r) =>
          r.userId === doc.userId &&
          r.operation === doc.operation &&
          r.idempotencyKey === doc.idempotencyKey,
      );
      if (exists) {
        const duplicateError: any = new Error(
          'E11000 duplicate key error collection',
        );
        duplicateError.code = 11000;
        throw duplicateError;
      }
      const record = {
        _id: 'idemp-' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...doc,
      };
      dbRecords.push(record);
      return record;
    }),

    findOne: jest.fn(async (filter: any) => {
      return (
        dbRecords.find(
          (r) =>
            r.userId === filter.userId &&
            r.operation === filter.operation &&
            r.idempotencyKey === filter.idempotencyKey,
        ) || null
      );
    }),

    updateOne: jest.fn(async (filter: any, update: any) => {
      const record = dbRecords.find((r) => r._id === filter._id);
      if (record && update.$set) {
        Object.assign(record, update.$set);
        record.updatedAt = new Date();
      }
      return { modifiedCount: record ? 1 : 0 };
    }),

    findOneAndUpdate: jest.fn(async (filter: any, update: any) => {
      const record = dbRecords.find(
        (r) =>
          r.userId === filter.userId &&
          r.operation === filter.operation &&
          r.idempotencyKey === filter.idempotencyKey &&
          r.status === filter.status,
      );
      if (record && update.$set) {
        Object.assign(record, update.$set);
      }
      return record || null;
    }),
  };

  const mockPostRepository = {
    create: jest.fn(),
    createMedia: jest.fn(),
    findByIdPopulated: jest.fn(),
  };

  const mockStoryRepository = {
    create: jest.fn(),
    createMedia: jest.fn(),
    findByIdPopulated: jest.fn(),
  };

  const mockGateway = {
    emitPostCreated: jest.fn(),
    emitStoryCreated: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dbRecords = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityIdempotencyService,
        PostService,
        StoryService,
        {
          provide: getModelToken(CommunityPublishIdempotency.name),
          useValue: mockIdempotencyModel,
        },
        { provide: PostRepository, useValue: mockPostRepository },
        { provide: StoryRepository, useValue: mockStoryRepository },
        { provide: CommunityGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    idempotencyService = module.get<CommunityIdempotencyService>(
      CommunityIdempotencyService,
    );
    postService = module.get<PostService>(PostService);
    storyService = module.get<StoryService>(StoryService);
  });

  describe('Durable Idempotency & Concurrency Safety', () => {
    it('executes exactly once when 5 concurrent requests with identical idempotencyKey arrive', async () => {
      const userId = 'user-concurrent-1';
      const idempotencyKey = 'req-key-abc-123';
      let postCreationCount = 0;

      mockPostRepository.create.mockImplementation(async (data) => {
        postCreationCount++;
        // Simulate real MongoDB write latency
        await new Promise((r) => setTimeout(r, 50));
        return { _id: 'post-100', ...data };
      });

      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: 'post-100',
        authorId: userId,
        content: 'Concurrent test post',
        media: [],
      });

      const payload = {
        content: 'Concurrent test post',
        audience: 'public',
      } as any;

      // 5 concurrent requests with identical key (simulating multiple workers or rapid retries)
      const promises = [
        postService.createPost(userId, payload, false, idempotencyKey),
        postService.createPost(userId, payload, false, idempotencyKey),
        postService.createPost(userId, payload, false, idempotencyKey),
        postService.createPost(userId, payload, false, idempotencyKey),
        postService.createPost(userId, payload, false, idempotencyKey),
      ];

      const results = await Promise.all(promises);

      // Verify exactly ONE database post was created
      expect(postCreationCount).toBe(1);
      expect(mockPostRepository.create).toHaveBeenCalledTimes(1);

      // Verify all 5 callers received identical response
      for (const res of results) {
        expect(res._id).toBe('post-100');
        expect(res.content).toBe('Concurrent test post');
      }

      // Verify durable DB record is marked COMPLETED
      expect(dbRecords.length).toBe(1);
      expect(dbRecords[0].status).toBe('COMPLETED');
      expect(dbRecords[0].resourceId).toBe('post-100');
    });

    it('returns completed snapshot without re-executing create on subsequent retry', async () => {
      const userId = 'user-retry-1';
      const idempotencyKey = 'retry-key-456';

      mockPostRepository.create.mockResolvedValue({
        _id: 'post-200',
        authorId: userId,
      });
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: 'post-200',
        authorId: userId,
        content: 'Retry post',
      });

      const payload = { content: 'Retry post' } as any;

      // First call: initial publish
      const res1 = await postService.createPost(
        userId,
        payload,
        false,
        idempotencyKey,
      );
      expect(res1._id).toBe('post-200');
      expect(mockPostRepository.create).toHaveBeenCalledTimes(1);

      // Second call: client network retry with same idempotency key
      const res2 = await postService.createPost(
        userId,
        payload,
        false,
        idempotencyKey,
      );
      expect(res2._id).toBe('post-200');
      // Must NOT call repository create again
      expect(mockPostRepository.create).toHaveBeenCalledTimes(1);
    });

    it('throws 409 Conflict when same idempotency key is reused with a different payload (Fingerprint Protection)', async () => {
      const userId = 'user-mismatch-1';
      const idempotencyKey = 'key-mismatch-789';

      mockPostRepository.create.mockResolvedValue({ _id: 'post-300' });
      mockPostRepository.findByIdPopulated.mockResolvedValue({
        _id: 'post-300',
      });

      // First publish with payload A
      await postService.createPost(
        userId,
        { content: 'Original content' } as any,
        false,
        idempotencyKey,
      );

      // Attempt to publish with different payload using the same idempotency key
      await expect(
        postService.createPost(
          userId,
          { content: 'Completely different content!' } as any,
          false,
          idempotencyKey,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('Section 10: does NOT create false duplicates — identical text with different keys creates 2 separate posts', async () => {
      const userId = 'user-intentional-1';
      let postSeq = 0;

      mockPostRepository.create.mockImplementation(async (data) => {
        postSeq++;
        return { _id: `post-seq-${postSeq}`, ...data };
      });
      mockPostRepository.findByIdPopulated.mockImplementation(async (id) => {
        return { _id: id, authorId: userId, content: 'Hello' };
      });

      const payload = { content: 'Hello' } as any;

      // Post A with key-A
      const postA = await postService.createPost(
        userId,
        payload,
        false,
        'key-A',
      );
      // Post B with key-B
      const postB = await postService.createPost(
        userId,
        payload,
        false,
        'key-B',
      );

      expect(postA._id).toBe('post-seq-1');
      expect(postB._id).toBe('post-seq-2');
      expect(postA._id).not.toBe(postB._id);
      expect(mockPostRepository.create).toHaveBeenCalledTimes(2);
      expect(dbRecords.length).toBe(2);
    });

    it('applies durable idempotency to story publishing', async () => {
      const userId = 'user-story-1';
      const idempotencyKey = 'story-key-001';

      mockStoryRepository.create.mockResolvedValue({ _id: 'story-1' });
      mockStoryRepository.findByIdPopulated.mockResolvedValue({
        _id: 'story-1',
        authorId: userId,
        text: 'Morning story',
      });

      const storyPayload = {
        type: 'TEXT',
        text: 'Morning story',
        backgroundColor: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      } as any;

      // 5 concurrent requests with identical key
      const results = await Promise.all([
        storyService.createStory(userId, storyPayload, false, idempotencyKey),
        storyService.createStory(userId, storyPayload, false, idempotencyKey),
        storyService.createStory(userId, storyPayload, false, idempotencyKey),
      ]);

      expect(mockStoryRepository.create).toHaveBeenCalledTimes(1);
      for (const res of results) {
        expect(res._id).toBe('story-1');
      }
      expect(dbRecords.some((r) => r.operation === 'CREATE_STORY')).toBe(true);
    });

    it('marks record as FAILED on execution error allowing retry', async () => {
      const userId = 'user-fail-1';
      const idempotencyKey = 'fail-key-001';

      mockPostRepository.create.mockRejectedValueOnce(
        new Error('Database disk full'),
      );

      await expect(
        postService.createPost(
          userId,
          { content: 'Will fail' } as any,
          false,
          idempotencyKey,
        ),
      ).rejects.toThrow('Database disk full');

      expect(dbRecords[0].status).toBe('FAILED');
    });
  });
});
