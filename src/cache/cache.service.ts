import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { TTL_CONFIGS, TTLUtils, TTLConfig } from './ttl.config';

/**
 * 缓存服务
 * 提供基本的缓存操作，避免过度抽象
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix = 'nest_eidos:cache:';
  private readonly redis: RedisClientType;

  constructor(@Inject('REDIS_CLIENT') redis: RedisClientType) {
    this.redis = redis;
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis 连接已关闭');
    } catch (error) {
      this.logger.error('关闭 Redis 连接时发生错误', error);
    }
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.keyPrefix + key;
      const value = await this.redis.get(fullKey);

      if (value === null) {
        this.logger.debug(`缓存未命中: ${key}`);
        return null;
      }

      this.logger.debug(`缓存命中: ${key}`);
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒、字符串或TTLConfig），默认使用默认TTL
   */
  async set<T>(key: string, value: T, ttl?: number | string | TTLConfig): Promise<void> {
    try {
      const fullKey = this.keyPrefix + key;
      const serializedValue = JSON.stringify(value);

      // 统一TTL处理
      const normalizedTtl = this.normalizeTTL(ttl);

      if (normalizedTtl && normalizedTtl > 0) {
        await this.redis.setEx(fullKey, normalizedTtl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      this.logger.debug(`设置缓存: ${key}, TTL: ${normalizedTtl || 'default'}s`);
    } catch (error) {
      this.logger.error(`设置缓存失败: ${key}`, error);
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.keyPrefix + key;
      await this.redis.del(fullKey);
      this.logger.debug(`删除缓存: ${key}`);
    } catch (error) {
      this.logger.error(`删除缓存失败: ${key}`, error);
    }
  }

  /**
   * 删除匹配模式的缓存
   * @param pattern 缓存键模式（不支持前缀，会自动添加）
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.keyPrefix + pattern;
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
        this.logger.debug(`删除缓存模式: ${pattern}, 删除了 ${keys.length} 个键`);
      }
    } catch (error) {
      this.logger.error(`删除缓存模式失败: ${pattern}`, error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      const pattern = this.keyPrefix + '*';
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
        this.logger.log(`清空所有缓存，删除了 ${keys.length} 个键`);
      }
    } catch (error) {
      this.logger.error('清空缓存失败', error);
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`检查缓存存在性失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      const fullKey = this.keyPrefix + key;
      await this.redis.expire(fullKey, ttl);
      this.logger.debug(`设置缓存过期时间: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`设置缓存过期时间失败: ${key}`, error);
    }
  }

  /**
   * 获取缓存剩余过期时间
   * @param key 缓存键
   * @returns 剩余时间（秒），-1 表示永不过期，-2 表示不存在
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.keyPrefix + key;
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`获取缓存过期时间失败: ${key}`, error);
      return -2;
    }
  }

  /**
   * 标准化TTL参数
   * @param ttl 过期时间
   * @returns 标准化的秒数
   */
  private normalizeTTL(ttl?: number | string | TTLConfig): number | undefined {
    if (!ttl) {
      return TTLUtils.toSeconds(TTL_CONFIGS.DEFAULT_CACHE); // 使用默认TTL
    }

    if (typeof ttl === 'number') {
      return ttl; // 秒数
    }

    if (typeof ttl === 'string') {
      // 简单解析时间字符串，如 "1h", "30m", "60s"
      const match = ttl.match(/^(\d+)([smhd])$/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
          case 's': return value;
          case 'm': return value * 60;
          case 'h': return value * 3600;
          case 'd': return value * 86400;
        }
      }
      // 如果无法解析，返回默认值
      this.logger.warn(`无法解析TTL字符串: ${ttl}，使用默认TTL`);
      return TTLUtils.toSeconds(TTL_CONFIGS.DEFAULT_CACHE);
    }

    if (typeof ttl === 'object' && TTLUtils.isValidTTL(ttl)) {
      return TTLUtils.toSeconds(ttl);
    }

    this.logger.warn(`无效的TTL格式: ${ttl}，使用默认TTL`);
    return TTLUtils.toSeconds(TTL_CONFIGS.DEFAULT_CACHE);
  }

  /**
   * 健康检查
   * @returns 健康状态
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const testKey = this.keyPrefix + `health_check_${Date.now()}`;
    const testValue = 'health_check_value';

    try {
      const startTime = Date.now();

      // 测试写入
      await this.redis.setEx(testKey, 1, testValue); // 1秒TTL

      // 测试读取
      const retrievedValue = await this.redis.get(testKey);

      // 测试删除
      await this.redis.del(testKey);

      const latency = Date.now() - startTime;

      if (retrievedValue === testValue) {
        this.logger.debug(`缓存健康检查通过，延迟: ${latency}ms`);
        return { status: 'healthy', latency };
      } else {
        return { status: 'unhealthy', error: '缓存数据不一致' };
      }
    } catch (error) {
      this.logger.error('缓存健康检查失败', error.stack);
      return { status: 'unhealthy', error: (error as Error).message };
    }
  }
}