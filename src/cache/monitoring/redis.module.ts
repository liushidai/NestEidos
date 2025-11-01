import { Module, Global } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import KeyvRedis from '@keyv/redis';
import { redisConfig } from '../../config/redis.config';
import { CacheService } from '../core/cache.service';
import { CacheMonitorService } from './cache-monitor.service';
import { TTL_CONFIGS, TTLUtils } from '../config/ttl.config';

@Global()
@Module({
  providers: [
    {
      provide: 'CACHE_INSTANCE',
      useFactory: () => {
        const config = redisConfig() as any;

        // 构建 Redis 连接配置对象（支持连接池配置）
        const redisOptions = {
          host: config.host,
          port: config.port,
          db: config.db,
          password: config.password,
          // 连接池配置
          maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
          retryDelayOnFailover: config.retryDelayOnFailover || 100,
          enableReadyCheck: config.enableReadyCheck !== false,
          connectTimeout: config.connectTimeout || 10000,
          commandTimeout: config.commandTimeout || 5000,
          lazyConnect: true,
          // 连接池配置
          family: 4,
          keepAlive: true,
          // 其他优化配置
          keyPrefix: '', // 前缀由Cacheable的namespace处理
        };

        // 配置 Redis 存储（使用配置对象而不是URL字符串）
        const redisStore = new KeyvRedis(redisOptions);

        // 统一的键前缀
        const keyPrefix = config.keyPrefix || 'nest_eidos:';

        return new Cacheable({
          secondary: redisStore, // 使用 Redis 作为存储
          ttl: TTLUtils.toCacheableFormat(TTL_CONFIGS.DEFAULT_CACHE), // 使用统一的TTL配置
          namespace: keyPrefix, // 使用 namespace 作为键前缀
          stats: true, // 启用统计功能
          nonBlocking: false, // 阻塞模式确保数据一致性
        });
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
    CacheMonitorService,
    CacheService,
  ],
  exports: ['CACHE_INSTANCE', CacheService, CacheMonitorService, 'TTL_CONFIGS', 'TTL_UTILS'], // 导出所有缓存相关服务
})
export class RedisModule {}