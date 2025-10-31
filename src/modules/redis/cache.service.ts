import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { TTL_CONFIGS, TTLUtils, TTLConfig } from '../../common/ttl/tls.config';
import { CacheMonitorService } from './cache-monitor.service';

/**
 * 缓存操作异常
 */
export class CacheOperationException extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly key?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'CacheOperationException';
  }
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject('CACHE_INSTANCE') private readonly cache: Cacheable,
    private readonly monitorService: CacheMonitorService,
  ) {}

  /**
   * 统一的错误处理方法
   * @param operation 操作名称
   * @param key 缓存键
   * @param error 原始错误
   * @param shouldThrow 是否抛出异常
   * @param fallbackValue 降级返回值
   */
  private handleError<T>(
    operation: string,
    key: string | undefined,
    error: Error,
    shouldThrow: boolean,
    fallbackValue?: T,
  ): T {
    const errorMessage = key ? `缓存${operation}失败: ${key}` : `缓存${operation}失败`;
    this.logger.error(errorMessage, error.stack);

    if (shouldThrow) {
      throw new CacheOperationException(errorMessage, operation, key, error);
    }

    this.logger.warn(`缓存${operation}失败，使用降级策略: ${key || 'N/A'}`);
    return fallbackValue as T;
  }

  /**
   * 获取缓存（读操作 - 优雅降级）
   */
  async get<T>(key: string): Promise<T | undefined> {
    const startTime = Date.now();
    try {
      const result = await this.cache.get<T>(key);
      const responseTime = Date.now() - startTime;

      // 记录监控指标
      this.monitorService.recordOperation(
        result !== undefined ? 'get_hits' : 'get_misses',
        responseTime
      );

      this.logger.debug(`获取缓存成功: ${key}, 结果: ${result !== undefined ? '命中' : '未命中'}, 延迟: ${responseTime}ms`);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.monitorService.recordOperation('error', responseTime);
      return this.handleError<T | undefined>('获取', key, error as Error, false, undefined);
    }
  }

  /**
   * 设置缓存（写操作 - 失败抛出异常）
   */
  async set<T>(key: string, value: T, ttl?: number | string | TTLConfig): Promise<void> {
    const startTime = Date.now();
    try {
      // 统一TTL处理
      const normalizedTtl = this.normalizeTTL(ttl);
      await this.cache.set(key, value, normalizedTtl);
      const responseTime = Date.now() - startTime;

      // 记录监控指标
      this.monitorService.recordOperation('set', responseTime);

      this.logger.debug(`设置缓存成功: ${key}, TTL: ${normalizedTtl || 'default'}, 延迟: ${responseTime}ms`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.monitorService.recordOperation('error', responseTime);
      this.handleError('设置', key, error as Error, true);
    }
  }

  /**
   * 删除缓存（写操作 - 失败抛出异常）
   */
  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.cache.delete(key);
      const responseTime = Date.now() - startTime;

      // 记录监控指标
      this.monitorService.recordOperation('delete', responseTime);

      this.logger.debug(`删除缓存成功: ${key}, 延迟: ${responseTime}ms`);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.monitorService.recordOperation('error', responseTime);
      this.handleError('删除', key, error as Error, true);
    }
  }

  /**
   * 标准化TTL参数
   */
  private normalizeTTL(ttl?: number | string | TTLConfig): string | undefined {
    if (!ttl) {
      return undefined; // 使用默认TTL
    }

    if (typeof ttl === 'string') {
      return ttl; // 已经是格式化字符串
    }

    if (typeof ttl === 'number') {
      return `${ttl}s`; // 秒数转换为格式化字符串
    }

    if (typeof ttl === 'object' && TTLUtils.isValidTTL(ttl)) {
      return TTLUtils.toCacheableFormat(ttl);
    }

    this.logger.warn(`无效的TTL格式: ${ttl}，使用默认TTL`);
    return undefined;
  }

  /**
   * 检查缓存是否存在（读操作 - 优雅降级）
   */
  async has(key: string): Promise<boolean> {
    try {
      const result = await this.cache.get(key);
      const exists = result !== undefined;
      this.logger.debug(`检查缓存存在性: ${key}, 结果: ${exists}`);
      return exists;
    } catch (error) {
      return this.handleError<boolean>('检查存在性', key, error as Error, false, false);
    }
  }

  /**
   * 清空所有缓存（写操作 - 失败抛出异常）
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.logger.log('清空所有缓存成功');
    } catch (error) {
      this.handleError('清空', undefined, error as Error, true);
    }
  }

  /**
   * 批量获取缓存（读操作 - 优雅降级）
   */
  async getMany<T>(keys: string[]): Promise<Array<T | undefined>> {
    try {
      const results = await this.cache.getMany<T>(keys);
      const hitCount = results.filter(result => result !== undefined).length;
      this.logger.debug(`批量获取缓存成功: ${keys.length}个键, 命中${hitCount}个`);
      return results;
    } catch (error) {
      this.logger.warn(`批量获取缓存失败，返回空数组: ${keys.join(',')}`);
      return keys.map(() => undefined);
    }
  }

  /**
   * 批量设置缓存（写操作 - 失败抛出异常）
   */
  async setMany<T>(items: Array<{ key: string; value: T; ttl?: number | string }>): Promise<void> {
    try {
      const cacheableItems = items.map(item => ({
        key: item.key,
        value: item.value,
        ttl: item.ttl,
      }));

      await this.cache.setMany(cacheableItems);
      this.logger.debug(`批量设置缓存成功: ${items.length}个键`);
    } catch (error) {
      const keys = items.map(item => item.key).join(',');
      this.handleError('批量设置', keys, error as Error, true);
    }
  }

  /**
   * 批量删除缓存（写操作 - 失败抛出异常）
   */
  async deleteMany(keys: string[]): Promise<void> {
    try {
      await this.cache.deleteMany(keys);
      this.logger.debug(`批量删除缓存成功: ${keys.length}个键`);
    } catch (error) {
      this.handleError('批量删除', keys.join(','), error as Error, true);
    }
  }

  /**
   * 检查缓存服务健康状态
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'health_check_value';

    try {
      const startTime = Date.now();

      // 测试写入
      await this.cache.set(testKey, testValue, 1000); // 1秒TTL

      // 测试读取
      const retrievedValue = await this.cache.get<string>(testKey);

      // 测试删除
      await this.cache.delete(testKey);

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

  /**
   * 获取缓存统计信息（如果支持）
   */
  async getStats(): Promise<any> {
    try {
      // 检查cacheable实例是否支持统计功能
      if (this.cache.stats) {
        return this.cache.stats;
      }
      return { message: '缓存统计功能未启用' };
    } catch (error) {
      this.logger.warn('获取缓存统计信息失败', error.stack);
      return { error: '统计信息获取失败' };
    }
  }
}