/**
 * TTL（Time To Live）配置和工具模块
 * 统一管理缓存过期时间的单位和格式
 */

export enum TTLUnit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

export interface TTLConfig {
  value: number;
  unit: TTLUnit;
}

export interface CacheTTLConfigs {
  /** 用户信息缓存 - 24小时 */
  USER_CACHE: TTLConfig;
  /** 短期缓存 - 5分钟 */
  SHORT_CACHE: TTLConfig;
  /** 中期缓存 - 30分钟 */
  MEDIUM_CACHE: TTLConfig;
  /** 长期缓存 - 24小时 */
  LONG_CACHE: TTLConfig;
  /** 认证Token缓存 - 30天（可配置） */
  AUTH_TOKEN: TTLConfig;
  /** 默认缓存 - 4小时 */
  DEFAULT_CACHE: TTLConfig;
  /** 缓存穿透防护 - 短期缓存空值，5分钟 */
  NULL_CACHE: TTLConfig;
}

/**
 * 缓存键前缀常量
 */
export const CACHE_KEYS = {
  /** Repository层数据缓存前缀 */
  REPOSITORY: 'repo',
  /** 认证Token缓存前缀 */
  AUTH: 'auth',
};

/**
 * 缓存穿透防护常量
 */
export const NULL_CACHE_VALUES = {
  /** 表示缓存空值的特殊标记 */
  NULL_PLACEHOLDER: '__NULL_CACHE_PLACEHOLDER__',
  /** 表示缓存空值的特殊标记（用于数字类型） */
  NULL_NUMBER_PLACEHOLDER: -999999999,
} as const;

/**
 * TTL配置常量
 */
export const TTL_CONFIGS: CacheTTLConfigs = {
  USER_CACHE: { value: 24, unit: TTLUnit.HOURS },
  SHORT_CACHE: { value: 5, unit: TTLUnit.MINUTES },
  MEDIUM_CACHE: { value: 30, unit: TTLUnit.MINUTES },
  LONG_CACHE: { value: 24, unit: TTLUnit.HOURS },
  NULL_CACHE: { value: 5, unit: TTLUnit.MINUTES },
  AUTH_TOKEN: { value: 30, unit: TTLUnit.DAYS }, // 默认30天，可通过配置覆盖
  DEFAULT_CACHE: { value: 4, unit: TTLUnit.HOURS },
};

/**
 * TTL工具类
 */
export class TTLUtils {
  /**
   * 将TTL配置转换为秒数
   */
  static toSeconds(config: TTLConfig): number {
    switch (config.unit) {
      case TTLUnit.SECONDS:
        return config.value;
      case TTLUnit.MINUTES:
        return config.value * 60;
      case TTLUnit.HOURS:
        return config.value * 3600;
      case TTLUnit.DAYS:
        return config.value * 86400;
      default:
        throw new Error(`Unsupported TTL unit: ${config.unit}`);
    }
  }

  /**
   * 将TTL配置转换为cacheable支持的格式字符串
   */
  static toCacheableFormat(config: TTLConfig): string {
    switch (config.unit) {
      case TTLUnit.SECONDS:
        return `${config.value}s`;
      case TTLUnit.MINUTES:
        return `${config.value}m`;
      case TTLUnit.HOURS:
        return `${config.value}h`;
      case TTLUnit.DAYS:
        return `${config.value}d`;
      default:
        throw new Error(`Unsupported TTL unit: ${config.unit}`);
    }
  }

  /**
   * 将TTL配置转换为毫秒数
   */
  static toMilliseconds(config: TTLConfig): number {
    return this.toSeconds(config) * 1000;
  }

  /**
   * 创建动态TTL配置（用于运行时配置）
   */
  static createDynamicTTL(value: number, unit: TTLUnit): TTLConfig {
    return { value, unit };
  }

  /**
   * 验证TTL配置是否有效
   */
  static isValidTTL(config: TTLConfig): boolean {
    return (
      config &&
      typeof config.value === 'number' &&
      config.value > 0 &&
      Object.values(TTLUnit).includes(config.unit)
    );
  }

  /**
   * 获取友好的TTL描述
   */
  static getDescription(config: TTLConfig): string {
    const unitNames = {
      [TTLUnit.SECONDS]: '秒',
      [TTLUnit.MINUTES]: '分钟',
      [TTLUnit.HOURS]: '小时',
      [TTLUnit.DAYS]: '天',
    };

    return `${config.value} ${unitNames[config.unit]}`;
  }

  /**
   * 检查值是否为缓存的空值标记
   */
  static isNullCacheValue<T>(value: T): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    // 检查字符串类型的空值标记
    if (typeof value === 'string' && value === NULL_CACHE_VALUES.NULL_PLACEHOLDER) {
      return true;
    }

    // 检查数字类型的空值标记
    if (typeof value === 'number' && value === NULL_CACHE_VALUES.NULL_NUMBER_PLACEHOLDER) {
      return true;
    }

    return false;
  }

  /**
   * 将 null 值转换为可缓存的标记值
   */
  static toCacheableNullValue<T>(): T {
    // 这里可以根据类型返回不同的标记值
    // 为了简化，统一返回字符串标记
    return NULL_CACHE_VALUES.NULL_PLACEHOLDER as unknown as T;
  }

  /**
   * 检查缓存值是否表示 null，并返回真实的 null 值
   */
  static fromCachedValue<T>(cachedValue: T): T | null {
    if (cachedValue === null || cachedValue === undefined) {
      return null;
    }

    if (TTLUtils.isNullCacheValue(cachedValue)) {
      return null;
    }

    return cachedValue;
  }
}

/**
 * 缓存键工具类
 */
export class CacheKeyUtils {
  /**
   * 生成Repository层缓存键
   * @param module 模块名（如 'user', 'album'）
   * @param type 数据类型（如 'id', 'username'）
   * @param identifier 标识符
   */
  static buildRepositoryKey(module: string, type: string, identifier: string): string {
    return `${CACHE_KEYS.REPOSITORY}:${module}:${type}:${identifier}`;
  }

  /**
   * 生成认证缓存键
   * @param type 类型（如 'token'）
   * @param identifier 标识符
   */
  static buildAuthKey(type: string, identifier: string): string {
    return `${CACHE_KEYS.AUTH}:${type}:${identifier}`;
  }
}