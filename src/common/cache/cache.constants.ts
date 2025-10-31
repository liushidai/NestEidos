/**
 * 缓存相关的常量定义
 */

export const CACHE_KEY_SEPARATOR = ':';
export const DEFAULT_CACHE_TTL = 3600; // 1小时

// 缓存键前缀
export const CACHE_PREFIXES = {
  METHOD: 'method',
} as const;

// 默认 TTL 配置（秒）
export const DEFAULT_TTL_CONFIG = {
  SHORT: 300,      // 5分钟 - 频繁变化的数据
  MEDIUM: 1800,    // 30分钟 - 中等变化频率
  LONG: 3600,      // 1小时 - 较少变化的数据
  VERY_LONG: 7200, // 2小时 - 很少变化的数据
} as const;