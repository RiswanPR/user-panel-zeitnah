import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserPresence,
  UserPresenceDocument,
  PresenceStatus,
} from '../schemas/user-presence.schema';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class PresenceService {
  constructor(
    @InjectModel(UserPresence.name)
    private readonly presenceModel: Model<UserPresenceDocument>,
    private readonly redisService: RedisService,
  ) {}

  async setPresence(
    userId: string,
    status: PresenceStatus,
  ): Promise<UserPresenceDocument> {
    const updated = await this.presenceModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          status,
          lastSeen: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // Cache in Redis for instant lookups (TTL 1 hour)
    await this.redisService.set(
      `msg:presence:${userId}`,
      JSON.stringify({ status, lastSeen: updated.lastSeen }),
      3600,
    );

    return updated;
  }

  async getPresence(userId: string): Promise<UserPresenceDocument> {
    // Check Redis cache first
    const cached = await this.redisService.get(`msg:presence:${userId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          userId,
          status: parsed.status,
          lastSeen: new Date(parsed.lastSeen),
        } as any;
      } catch (err) {
        // fallback to MongoDB
      }
    }

    let presence = await this.presenceModel.findOne({ userId });
    if (!presence) {
      presence = await this.presenceModel.create({
        userId,
        status: PresenceStatus.OFFLINE,
        lastSeen: new Date(),
      });
    }

    await this.redisService.set(
      `msg:presence:${userId}`,
      JSON.stringify({ status: presence.status, lastSeen: presence.lastSeen }),
      3600,
    );

    return presence;
  }
}
