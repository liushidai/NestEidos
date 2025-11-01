import { Module, Global } from '@nestjs/common';
import { SimpleCacheService } from './simple-cache.service';

/**
 * 缓存模块
 * 提供统一的缓存功能
 */
@Global()
@Module({
  providers: [
    SimpleCacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const Redis = require('ioredis');
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          db: parseInt(process.env.REDIS_DB || '0', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          keyPrefix: 'nest_eidos:',
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        });
      },
    },
  ],
  exports: [SimpleCacheService],
})
export class CacheModule {}