// 核心缓存服务
export { CacheService } from './cache.service';
export { RedisModule } from './redis.module';
export { RedisModule as CacheModule } from './redis.module';

// 配置
export { TTL_CONFIGS, TTLUtils, CacheKeyUtils, TTLUnit, NULL_CACHE_VALUES } from './ttl.config';