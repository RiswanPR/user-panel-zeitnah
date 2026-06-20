import { Global, Module, Logger } from '@nestjs/common';

import { Redis } from '@upstash/redis';

import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const logger = new Logger('RedisModule');

        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!url || !token) {
          logger.error(
            'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in .env',
          );

          throw new Error('Missing Upstash Redis credentials');
        }

        const client = new Redis({ url, token });

        logger.log('🔴 Upstash Redis client initialized');

        return client;
      },
    },
    RedisService,
  ],

  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
