import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/**
 * 简单的缓存服务
 * 提供基本的缓存操作，避免过度抽象
 */
@Injectable()
export class SimpleCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(SimpleCacheService.name);
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
   * @param ttl 过期时间（秒），默认 1 小时
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      const fullKey = this.keyPrefix + key;
      const serializedValue = JSON.stringify(value);

      await this.redis.setEx(fullKey, ttl, serializedValue);
      this.logger.debug(`设置缓存: ${key}, TTL: ${ttl}s`);
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
}