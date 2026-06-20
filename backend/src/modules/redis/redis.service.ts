import {
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';

import { Redis } from '@upstash/redis';

import { REDIS_CLIENT, OTP_PREFIX, OTP_TTL_SECONDS } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  // ==================================================
  // GENERIC HELPERS
  // ==================================================

  /**
   * Get a value by key.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get<string>(key);
  }

  /**
   * Set a key/value pair with an optional TTL (in seconds).
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete a key.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if a key exists.
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);

    return result === 1;
  }

  /**
   * Get the remaining TTL of a key in seconds.
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ==================================================
  // OTP HELPERS
  // ==================================================

  /**
   * Store a hashed OTP in Redis with automatic TTL expiry.
   * Key format: otp:{context}:{email}
   */
  async setOtp(
    email: string,
    hashedOtp: string,
    context: 'login' | 'register' = 'login',
    ttlSeconds: number = OTP_TTL_SECONDS,
  ): Promise<void> {
    const key = `${OTP_PREFIX}${context}:${email.toLowerCase().trim()}`;

    await this.client.set(key, hashedOtp, { ex: ttlSeconds });

    this.logger.debug(`OTP stored for ${context}:${email} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Retrieve a hashed OTP from Redis.
   */
  async getOtp(
    email: string,
    context: 'login' | 'register' = 'login',
  ): Promise<string | null> {
    const key = `${OTP_PREFIX}${context}:${email.toLowerCase().trim()}`;

    return this.client.get<string>(key);
  }

  /**
   * Delete an OTP from Redis (after successful verification).
   */
  async deleteOtp(
    email: string,
    context: 'login' | 'register' = 'login',
  ): Promise<void> {
    const key = `${OTP_PREFIX}${context}:${email.toLowerCase().trim()}`;

    await this.client.del(key);

    this.logger.debug(`OTP deleted for ${context}:${email}`);
  }
}
