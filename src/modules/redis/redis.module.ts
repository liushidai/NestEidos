import { Module, Global } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import KeyvRedis from '@keyv/redis';
import { redisConfig } from '../../config/redis.config';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    {
      provide: 'CACHE_INSTANCE',
      useFactory: () => {
        const config = redisConfig() as any;
        // 构建 Redis 连接字符串
        const redisUrl = config.password
          ? `redis://:${config.password}@${config.host}:${config.port}/${config.db}`
          : `redis://${config.host}:${config.port}/${config.db}`;

        // 配置 Redis 存储
        const redisStore = new KeyvRedis(redisUrl);

        return new Cacheable({
          secondary: redisStore, // 使用 Redis 作为存储
          ttl: '4h', // 默认缓存时间为 4 小时
          // 在 cacheable 中，keyPrefix 需要通过其他方式设置
        });
      },
    },
    CacheService,
  ],
  exports: ['CACHE_INSTANCE', CacheService], // 导出缓存实例和服务
})
export class RedisModule {}