import { Injectable, Logger } from '@nestjs/common';
import { Cacheable, DEFAULT_TTL_CONFIG } from '../decorators/cacheable.decorator';
import { CacheManagementService } from '../services/cache-management.service';
import { DEFAULT_CACHE_TTL } from '../cache.constants';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

@Injectable()
export class SampleCacheService {
  private readonly logger = new Logger(SampleCacheService.name);

  constructor(
    private readonly cacheManagementService: CacheManagementService,
  ) {}

  /**
   * 示例1：获取用户信息（默认1小时缓存）
   */
  @Cacheable()
  async getUserById(id: string): Promise<User> {
    this.logger.log(`执行数据库查询获取用户: ${id}`);

    // 模拟数据库查询
    await this.simulateDatabaseDelay();

    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      createdAt: new Date(),
    };
  }

  /**
   * 示例2：获取产品列表（30分钟缓存）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.MEDIUM })
  async getProductsByCategory(category: string): Promise<Product[]> {
    this.logger.log(`执行数据库查询获取产品列表: ${category}`);

    // 模拟数据库查询
    await this.simulateDatabaseDelay();

    return [
      {
        id: `1`,
        name: `Product 1 in ${category}`,
        price: 100,
        category,
      },
      {
        id: `2`,
        name: `Product 2 in ${category}`,
        price: 200,
        category,
      },
    ];
  }

  /**
   * 示例3：获取热门产品（5分钟缓存，数据变化频繁）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
  async getHotProducts(limit: number = 10): Promise<Product[]> {
    this.logger.log(`执行数据库查询获取热门产品，限制: ${limit}`);

    // 模拟数据库查询
    await this.simulateDatabaseDelay();

    return Array.from({ length: limit }, (_, index) => ({
      id: `hot-${index + 1}`,
      name: `Hot Product ${index + 1}`,
      price: Math.floor(Math.random() * 1000) + 50,
      category: 'hot',
    }));
  }

  /**
   * 示例4：实时数据查询（禁用缓存）
   */
  @Cacheable({ disabled: true })
  async getRealTimeStock(productId: string): Promise<number> {
    this.logger.log(`执行实时库存查询: ${productId}`);

    // 模拟实时数据查询
    await this.simulateDatabaseDelay();

    return Math.floor(Math.random() * 1000);
  }

  /**
   * 示例5：复合查询（1小时缓存）
   */
  @Cacheable()
  async getUserWithStats(userId: string, includeStats: boolean = false): Promise<{
    user: User;
    stats?: {
      orderCount: number;
      totalSpent: number;
    };
  }> {
    this.logger.log(`执行复合查询: 用户=${userId}, 包含统计=${includeStats}`);

    // 模拟数据库查询
    await this.simulateDatabaseDelay();

    const user = await this.getUserById(userId);

    if (!includeStats) {
      return { user };
    }

    return {
      user,
      stats: {
        orderCount: Math.floor(Math.random() * 100),
        totalSpent: Math.floor(Math.random() * 10000),
      },
    };
  }

  /**
   * 手动清除缓存的示例方法
   */
  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    this.logger.log(`更新用户: ${userId}`);

    // 模拟数据库更新
    await this.simulateDatabaseDelay();

    // 清除相关的缓存
    await this.cacheManagementService.clearMethodCacheWithArgs(
      'SampleCacheService',
      'getUserById',
      [userId],
    );

    // 如果有其他相关的缓存也需要清除
    await this.cacheManagementService.clearMethodCache(
      'SampleCacheService',
      'getUserWithStats',
    );

    return {
      id: userId,
      name: updateData.name || 'Updated User',
      email: updateData.email || `updated-${userId}@example.com`,
      createdAt: new Date(),
    };
  }

  /**
   * 清除产品类别缓存的示例
   */
  async updateProductCategory(oldCategory: string, newCategory: string): Promise<void> {
    this.logger.log(`更新产品类别: ${oldCategory} -> ${newCategory}`);

    // 模拟数据库更新
    await this.simulateDatabaseDelay();

    // 清除相关缓存
    await this.cacheManagementService.clearMethodCache(
      'SampleCacheService',
      'getProductsByCategory',
    );

    // 清除旧类别的缓存
    await this.cacheManagementService.clearMethodCacheWithArgs(
      'SampleCacheService',
      'getProductsByCategory',
      [oldCategory],
    );

    // 清除新类别的缓存
    await this.cacheManagementService.clearMethodCacheWithArgs(
      'SampleCacheService',
      'getProductsByCategory',
      [newCategory],
    );
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<any> {
    return this.cacheManagementService.getCacheStats();
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    this.logger.log('清除所有缓存');
    await this.cacheManagementService.clearAllMethodCache();
  }

  /**
   * 演示手动设置缓存
   */
  async setCustomCache(key: string, value: any, ttl: number = DEFAULT_CACHE_TTL): Promise<void> {
    this.logger.log(`手动设置缓存: ${key}, TTL: ${ttl}s`);
    await this.cacheManagementService.setCache('SampleCacheService', 'customMethod', [key], value, ttl);
  }

  /**
   * 演示手动获取缓存
   */
  async getCustomCache(key: string): Promise<any> {
    return this.cacheManagementService.getCache('SampleCacheService', 'customMethod', [key]);
  }

  /**
   * 模拟数据库延迟
   */
  private async simulateDatabaseDelay(): Promise<void> {
    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
}