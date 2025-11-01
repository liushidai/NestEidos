import { Module, Global } from '@nestjs/common';
import { SimpleCacheService } from './simple-cache.service';
import { createClient, RedisClientType } from 'redis';

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
      useFactory: async () => {
        const client: RedisClientType = createClient({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
          },
          database: parseInt(process.env.REDIS_DB || '0', 10),
          password: process.env.REDIS_PASSWORD || undefined,
        });

        // 错误处理
        client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        // 连接事件
        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        client.on('ready', () => {
          console.log('Redis Client Ready');
        });

        client.on('end', () => {
          console.log('Redis Client Connection Ended');
        });

        // 连接到 Redis
        await client.connect();

        return client;
      },
    },
  ],
  exports: [SimpleCacheService],
})
export class CacheModule {}