import { SetMetadata } from '@nestjs/common';

/**
 * 缓存失效策略配置
 */
export interface CacheInvalidationEntry {
  /** 方法名 */
  methodName: string;
  /** 参数映射规则 */
  paramMapping?: string[];
  /** 是否清理所有参数的缓存 */
  clearAll?: boolean;
}

/**
 * 缓存失效配置
 */
export interface CacheInvalidationConfig {
  /** 需要清理的缓存条目列表 */
  entries: CacheInvalidationEntry[];
}

/**
 * 缓存失效元数据键
 */
export const CACHE_INVALIDATION_METADATA_KEY = 'cache_invalidation';

/**
 * 缓存失效装饰器
 * 用于自动清理相关缓存
 *
 * @param config 缓存失效配置
 *
 * @example
 * ```typescript
 * @CacheInvalidation({
 *   entries: [
 *     { methodName: 'findById', paramMapping: ['id'] },
 *     { methodName: 'findByUserName', paramMapping: ['userName'] },
 *     { methodName: 'existsByUserName', paramMapping: ['userName'] }
 *   ]
 * })
 * async updateUser(id: string, data: UpdateUserDto): Promise<User> {
 *   // 方法执行完毕后会自动清理相关缓存
 * }
 * ```
 */
export function CacheInvalidation(config: CacheInvalidationConfig): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_INVALIDATION_METADATA_KEY, config)(target, propertyKey, descriptor);
  };
}

/**
 * 获取方法的缓存失效配置
 * @param target 目标对象
 * @param propertyKey 属性名
 * @returns 缓存失效配置
 */
export function getCacheInvalidationConfig(
  target: any,
  propertyKey: string | symbol,
): CacheInvalidationConfig | null {
  return Reflect.getMetadata(CACHE_INVALIDATION_METADATA_KEY, target, propertyKey);
}