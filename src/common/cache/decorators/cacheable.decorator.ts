import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { MethodCacheInterceptor } from '../interceptors/method-cache.interceptor';
import { DEFAULT_CACHE_TTL } from '../cache.constants';

/**
 * 缓存选项接口
 */
export interface CacheableOptions {
  /** 缓存时间（秒），默认 3600 秒 */
  ttl?: number;
  /** 是否禁用缓存 */
  disabled?: boolean;
}

/**
 * 缓存元数据键
 */
export const CACHEABLE_METADATA_KEY = 'cacheable';

/**
 * @Cacheable 装饰器
 * 为方法添加缓存功能
 *
 * @param options 缓存选项
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Cacheable({ ttl: 1800 }) // 30分钟缓存
 *   async getUserById(id: string): Promise<User> {
 *     return this.userRepository.findById(id);
 *   }
 *
 *   @Cacheable() // 使用默认1小时缓存
 *   async getAllUsers(): Promise<User[]> {
 *     return this.userRepository.findAll();
 *   }
 *
 *   @Cacheable({ disabled: true }) // 禁用缓存
 *   async getRealTimeData(): Promise<Data> {
 *     return this.fetchRealTimeData();
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  const { ttl = DEFAULT_CACHE_TTL, disabled = false } = options;

  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 设置元数据
    SetMetadata(CACHEABLE_METADATA_KEY, { ttl, disabled })(target, propertyKey, descriptor);

    // 应用拦截器
    return UseInterceptors(MethodCacheInterceptor)(target, propertyKey, descriptor);
  };
}

/**
 * 获取方法的缓存元数据
 * @param target 目标对象
 * @param propertyKey 属性名
 * @returns 缓存元数据
 */
export function getCacheableMetadata(
  target: any,
  propertyKey: string | symbol,
): CacheableOptions | null {
  return Reflect.getMetadata(CACHEABLE_METADATA_KEY, target, propertyKey);
}