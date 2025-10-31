import { CACHE_KEY_SEPARATOR, CACHE_PREFIXES } from './cache.constants';

/**
 * 缓存工具类
 */
export class CacheUtils {
  /**
   * 生成方法级缓存键
   * @param className 类名
   * @param methodName 方法名
   * @param args 方法参数
   * @returns 缓存键
   */
  static generateMethodKey(
    className: string,
    methodName: string,
    args: any[] = [],
  ): string {
    const keyParts = [
      CACHE_PREFIXES.METHOD,
      className,
      methodName,
    ];

    // 将参数序列化为字符串
    if (args.length > 0) {
      const serializedArgs = args.map(arg => {
        if (arg === null || arg === undefined) {
          return 'null';
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      });
      keyParts.push(...serializedArgs);
    }

    return keyParts.join(CACHE_KEY_SEPARATOR);
  }

  /**
   * 生成模式匹配的缓存键
   * @param prefix 前缀
   * @param className 类名（可选）
   * @param methodName 方法名（可选）
   * @returns 缓存键模式
   */
  static generateKeyPattern(
    prefix?: string,
    className?: string,
    methodName?: string,
  ): string {
    const keyParts = [];
    if (prefix) {
      keyParts.push(prefix);
    } else {
      keyParts.push(CACHE_PREFIXES.METHOD);
    }
    if (className) {
      keyParts.push(className);
    }
    if (methodName) {
      keyParts.push(methodName);
    }
    return keyParts.join(CACHE_KEY_SEPARATOR);
  }

  /**
   * 检查缓存键是否匹配模式
   * @param key 缓存键
   * @param pattern 模式
   * @returns 是否匹配
   */
  static matchesPattern(key: string, pattern: string): boolean {
    if (pattern.endsWith(CACHE_KEY_SEPARATOR)) {
      // 模式以分隔符结尾，匹配所有以该模式开头的键
      return key.startsWith(pattern);
    }
    return key === pattern;
  }

  /**
   * 从缓存键中提取类名和方法名
   * @param key 缓存键
   * @returns 解析结果
   */
  static parseKey(key: string): { className: string; methodName: string } | null {
    const parts = key.split(CACHE_KEY_SEPARATOR);
    if (parts.length >= 3 && parts[0] === CACHE_PREFIXES.METHOD) {
      return {
        className: parts[1],
        methodName: parts[2],
      };
    }
    return null;
  }
}