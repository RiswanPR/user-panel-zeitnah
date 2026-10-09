import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  RequestTimeoutException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import {
  CommunityPublishIdempotency,
  CommunityPublishIdempotencyDocument,
} from '../schemas/idempotency.schema';

@Injectable()
export class CommunityIdempotencyService {
  private readonly logger = new Logger(CommunityIdempotencyService.name);

  constructor(
    @Optional()
    @InjectModel(CommunityPublishIdempotency.name)
    private readonly idempotencyModel?: Model<CommunityPublishIdempotencyDocument>,
  ) {}

  /**
   * Deterministically computes an SHA-256 fingerprint for a publish payload (Section 7).
   */
  computeFingerprint(userId: string, operation: string, payload: any): string {
    const normalizedMedia = Array.isArray(payload.media)
      ? payload.media
          .map((m: any) => ({
            url: (m?.url || '').split('?')[0].trim(),
            type: m?.type || 'image',
          }))
          .sort((a: any, b: any) => a.url.localeCompare(b.url))
      : payload.mediaUrl
        ? [(payload.mediaUrl || '').split('?')[0].trim()]
        : [];

    const normalizedTags = Array.isArray(payload.tags)
      ? [...payload.tags].sort()
      : [];

    const normalizedHashtags = Array.isArray(payload.hashtags)
      ? [...payload.hashtags].sort()
      : [];

    const normalizedMentions = Array.isArray(payload.mentions)
      ? [...payload.mentions].sort()
      : [];

    const canonicalData = {
      userId,
      operation,
      content: (payload.content || payload.text || '').trim(),
      type: (payload.type || '').toUpperCase(),
      audience: (payload.audience || '').toUpperCase(),
      courseId: payload.courseId || '',
      batchId: payload.batchId || '',
      originalPostId: payload.originalPostId || '',
      quoteText: (payload.quoteText || '').trim(),
      media: normalizedMedia,
      tags: normalizedTags,
      hashtags: normalizedHashtags,
      mentions: normalizedMentions,
    };

    return createHash('sha256')
      .update(JSON.stringify(canonicalData))
      .digest('hex');
  }

  /**
   * Multi-instance safe execution with MongoDB-backed durable idempotency (Sections 5, 8, 9, 10).
   */
  async executeWithIdempotency<T>(
    userId: string,
    operation: 'CREATE_POST' | 'CREATE_STORY',
    idempotencyKey: string | undefined,
    payload: any,
    execute: () => Promise<T>,
  ): Promise<T> {
    // If the database model is unavailable or no key is supplied, run direct execution
    if (
      !this.idempotencyModel ||
      !idempotencyKey ||
      typeof idempotencyKey !== 'string' ||
      !idempotencyKey.trim()
    ) {
      return execute();
    }

    const key = idempotencyKey.trim();
    const fingerprint = this.computeFingerprint(userId, operation, payload);

    let isLeader = false;
    let lockRecordId: string | null = null;

    // 1. Attempt atomic lock acquisition via unique index insert
    try {
      const created = await this.idempotencyModel.create({
        userId,
        operation,
        idempotencyKey: key,
        requestFingerprint: fingerprint,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      isLeader = true;
      lockRecordId = created._id;
    } catch (err: any) {
      if (err?.code === 11000) {
        // Record already exists for this (userId, operation, idempotencyKey)
        isLeader = false;
      } else {
        this.logger.error(
          `Error attempting to acquire idempotency lock: ${err.message}`,
          err.stack,
        );
        // Fallback to direct execution on unexpected DB error to avoid blocking the user
        return execute();
      }
    }

    // 2. If Leader, execute publish and record the result
    if (isLeader && lockRecordId) {
      try {
        const result = await execute();
        await this.idempotencyModel.updateOne(
          { _id: lockRecordId as any },
          {
            $set: {
              status: 'COMPLETED',
              resourceId: (result as any)?._id || (result as any)?.id,
              responseSnapshot: result,
            },
          },
        );
        return result;
      } catch (execErr) {
        // Mark as FAILED so client can retry or receive genuine error
        await this.idempotencyModel.updateOne(
          { _id: lockRecordId as any },
          { $set: { status: 'FAILED' } },
        );
        throw execErr;
      }
    }

    // 3. Follower / Concurrent request / Retry handling
    const existing = await this.idempotencyModel.findOne({
      userId,
      operation,
      idempotencyKey: key,
    });

    if (!existing) {
      return execute();
    }

    // Section 7: Request Fingerprint Protection
    if (existing.requestFingerprint !== fingerprint) {
      this.logger.warn(
        `Idempotency payload mismatch for user ${userId}, op ${operation}, key ${key}`,
      );
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message:
          'Idempotency key has already been used with a different request payload.',
        code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
      });
    }

    // If already COMPLETED, return snapshot immediately
    if (existing.status === 'COMPLETED' && existing.responseSnapshot) {
      return existing.responseSnapshot as T;
    }

    // If PENDING, wait for the leader process to finalize (up to 15s)
    const startTime = Date.now();
    const maxWaitMs = 15000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 100));
      const polled = await this.idempotencyModel.findOne({
        userId,
        operation,
        idempotencyKey: key,
      });

      if (polled) {
        if (polled.status === 'COMPLETED' && polled.responseSnapshot) {
          return polled.responseSnapshot as T;
        }
        if (polled.status === 'FAILED') {
          throw new InternalServerErrorException(
            'The publish operation previously failed. Please try again.',
          );
        }
      }
    }

    // Section 9 Crash Safety: If PENDING > 20s, process may have died; attempt to reclaim lock
    const reclaimed = await this.idempotencyModel.findOneAndUpdate(
      {
        userId,
        operation,
        idempotencyKey: key,
        status: 'PENDING',
        createdAt: { $lt: new Date(Date.now() - 20000) },
      },
      {
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );

    if (reclaimed) {
      try {
        const result = await execute();
        await this.idempotencyModel.updateOne(
          { _id: reclaimed._id },
          {
            $set: {
              status: 'COMPLETED',
              resourceId: (result as any)?._id || (result as any)?.id,
              responseSnapshot: result,
            },
          },
        );
        return result;
      } catch (err) {
        await this.idempotencyModel.updateOne(
          { _id: reclaimed._id },
          { $set: { status: 'FAILED' } },
        );
        throw err;
      }
    }

    throw new RequestTimeoutException(
      'Timeout waiting for concurrent publish operation to complete.',
    );
  }
}
