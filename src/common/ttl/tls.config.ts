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
  /** 长期缓存 - 2小时 */
  LONG_CACHE: TTLConfig;
  /** 认证Token缓存 - 30天（可配置） */
  AUTH_TOKEN: TTLConfig;
  /** 默认缓存 - 4小时 */
  DEFAULT_CACHE: TTLConfig;
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
 * TTL配置常量
 */
export const TTL_CONFIGS: CacheTTLConfigs = {
  USER_CACHE: { value: 24, unit: TTLUnit.HOURS },
  SHORT_CACHE: { value: 5, unit: TTLUnit.MINUTES },
  MEDIUM_CACHE: { value: 30, unit: TTLUnit.MINUTES },
  LONG_CACHE: { value: 2, unit: TTLUnit.HOURS },
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