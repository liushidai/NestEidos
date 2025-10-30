import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix: string;

  constructor(
    @Inject('CACHE_INSTANCE') private readonly cache: Cacheable,
    private readonly configService: ConfigService,
  ) {
    this.keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'nest_eidos:';
  }

  // 添加前缀到键名
  private addPrefix(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(this.addPrefix(key));
    } catch (error) {
      this.logger.error(`获取缓存失败: ${key}`, error.stack);
      return undefined;
    }
  }

  // 设置缓存
  async set<T>(key: string, value: T, ttl?: number | string): Promise<void> {
    try {
      await this.cache.set(this.addPrefix(key), value, ttl);
      this.logger.debug(`设置缓存成功: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`设置缓存失败: ${key}`, error.stack);
      throw error;
    }
  }

  // 删除缓存
  async delete(key: string): Promise<void> {
    try {
      await this.cache.delete(this.addPrefix(key));
      this.logger.debug(`删除缓存成功: ${key}`);
    } catch (error) {
      this.logger.error(`删除缓存失败: ${key}`, error.stack);
      throw error;
    }
  }

  // 检查缓存是否存在
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.cache.get(this.addPrefix(key));
      return value !== undefined;
    } catch (error) {
      this.logger.error(`检查缓存存在性失败: ${key}`, error.stack);
      return false;
    }
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.logger.log('清空所有缓存成功');
    } catch (error) {
      this.logger.error('清空缓存失败', error.stack);
      throw error;
    }
  }
}