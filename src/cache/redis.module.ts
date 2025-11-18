import { Module, Global } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { redisConfig } from '../config/redis.config';
import { CacheService } from './cache.service';
import { TTL_CONFIGS, TTLUtils } from './ttl.config';

interface RedisConfigOptions {
  host: string;
  port: number;
  connectTimeout?: number;
  db: number;
  password?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
}

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (): Promise<RedisClientType> => {
        const config = redisConfig() as RedisConfigOptions;

        // 构建 Redis 连接配置对象
        const redisOptions = {
          socket: {
            host: config.host,
            port: config.port,
            connectTimeout: config.connectTimeout || 10000,
            lazyConnect: true,
          },
          database: config.db,
          password: config.password,
          // 重试配置
          maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
          retryDelayOnFailover: config.retryDelayOnFailover || 100,
        };

        const client = createClient(redisOptions);

        // 错误处理
        client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        client.on('ready', () => {
          console.log('Redis Client Ready');
        });

        // 连接到 Redis
        await client.connect();

        return client;
      },
    },
    {
      provide: 'TTL_CONFIGS',
      useValue: TTL_CONFIGS,
    },
    {
      provide: 'TTL_UTILS',
      useValue: TTLUtils,
    },
    CacheService,
  ],
  exports: ['REDIS_CLIENT', CacheService, 'TTL_CONFIGS', 'TTL_UTILS'], // 导出所有缓存相关服务
})
export class RedisModule {}
