import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheUtils } from '../cache.utils';

@Injectable()
export class CacheManagementService {
  private readonly logger = new Logger(CacheManagementService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * 清除指定类的所有缓存
   * @param className 类名
   */
  async clearClassCache(className: string): Promise<void> {
    try {
      const pattern = CacheUtils.generateKeyPattern(className);
      const keys = await this.getKeysByPattern(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
        this.logger.log(`已清除 ${className} 类的 ${keys.length} 个缓存项`);
      }
    } catch (error) {
      this.logger.error(`清除 ${className} 类缓存失败`, error.stack);
    }
  }

  /**
   * 清除指定方法的所有缓存
   * @param className 类名
   * @param methodName 方法名
   */
  async clearMethodCache(className: string, methodName: string): Promise<void> {
    try {
      const pattern = CacheUtils.generateKeyPattern(className, methodName);
      const keys = await this.getKeysByPattern(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
        this.logger.log(`已清除 ${className}.${methodName} 方法的 ${keys.length} 个缓存项`);
      }
    } catch (error) {
      this.logger.error(`清除 ${className}.${methodName} 方法缓存失败`, error.stack);
    }
  }

  /**
   * 清除指定方法参数的缓存
   * @param className 类名
   * @param methodName 方法名
   * @param args 方法参数
   */
  async clearMethodCacheWithArgs(
    className: string,
    methodName: string,
    args: any[] = [],
  ): Promise<void> {
    try {
      const cacheKey = CacheUtils.generateMethodKey(className, methodName, args);
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`已清除缓存: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`清除缓存失败: ${className}.${methodName}`, error.stack);
    }
  }

  /**
   * 清除所有方法级缓存
   */
  async clearAllMethodCache(): Promise<void> {
    try {
      const pattern = CacheUtils.generateKeyPattern('method');
      const keys = await this.getKeysByPattern(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
        this.logger.log(`已清除所有 ${keys.length} 个方法级缓存项`);
      }
    } catch (error) {
      this.logger.error('清除所有方法级缓存失败', error.stack);
    }
  }

  /**
   * 手动设置缓存
   * @param className 类名
   * @param methodName 方法名
   * @param args 方法参数
   * @param value 缓存值
   * @param ttl 缓存时间（秒）
   */
  async setCache(
    className: string,
    methodName: string,
    args: any[],
    value: any,
    ttl: number,
  ): Promise<void> {
    try {
      const cacheKey = CacheUtils.generateMethodKey(className, methodName, args);
      await this.cacheManager.set(cacheKey, value, { ttl } as any);
      this.logger.debug(`手动设置缓存: ${cacheKey}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`设置缓存失败: ${className}.${methodName}`, error.stack);
    }
  }

  /**
   * 手动获取缓存
   * @param className 类名
   * @param methodName 方法名
   * @param args 方法参数
   * @returns 缓存值
   */
  async getCache(
    className: string,
    methodName: string,
    args: any[] = [],
  ): Promise<any> {
    try {
      const cacheKey = CacheUtils.generateMethodKey(className, methodName, args);
      return await this.cacheManager.get(cacheKey);
    } catch (error) {
      this.logger.error(`获取缓存失败: ${className}.${methodName}`, error.stack);
      return undefined;
    }
  }

  /**
   * 检查缓存是否存在
   * @param className 类名
   * @param methodName 方法名
   * @param args 方法参数
   * @returns 是否存在缓存
   */
  async hasCache(
    className: string,
    methodName: string,
    args: any[] = [],
  ): Promise<boolean> {
    try {
      const cacheKey = CacheUtils.generateMethodKey(className, methodName, args);
      const value = await this.cacheManager.get(cacheKey);
      return value !== undefined;
    } catch (error) {
      this.logger.error(`检查缓存失败: ${className}.${methodName}`, error.stack);
      return false;
    }
  }

  /**
   * 根据模式获取所有匹配的键
   * 注意：这是一个简化实现，实际使用中可能需要根据具体的缓存管理器实现
   */
  private async getKeysByPattern(pattern: string): Promise<string[]> {
    // 由于 @nestjs/cache-manager 的 Cache 接口不支持通配符查询，
    // 这里提供一个简化实现。在实际项目中，可能需要：
    // 1. 使用支持模式查询的缓存管理器（如 Redis）
    // 2. 维护一个键的注册表
    // 3. 使用其他方式来实现缓存清理

    try {
      // 尝试获取缓存管理器的存储后端
      const cacheStore = (this.cacheManager as any).store;
      if (cacheStore && cacheStore.keys) {
        const allKeys = await cacheStore.keys();
        return allKeys.filter((key: string) => CacheUtils.matchesPattern(key, pattern));
      }

      // 如果无法获取键列表，返回空数组
      this.logger.warn('无法获取缓存键列表，模式匹配功能不可用');
      return [];
    } catch (error) {
      this.logger.error('获取缓存键列表失败', error.stack);
      return [];
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    methodCacheKeys: number;
  }> {
    try {
      const pattern = CacheUtils.generateKeyPattern('method');
      const methodKeys = await this.getKeysByPattern(pattern);

      return {
        totalKeys: methodKeys.length,
        methodCacheKeys: methodKeys.length,
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败', error.stack);
      return {
        totalKeys: 0,
        methodCacheKeys: 0,
      };
    }
  }
}