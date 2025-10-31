import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * 创建模拟缓存管理器，支持TTL和完整的缓存功能
 */
export function createMockCacheManager(): jest.Mocked<Cache> & {
  store: { keys: jest.Mock };
  data: Map<string, any>;
  timeouts: Map<string, NodeJS.Timeout>;
} {
  const data = new Map<string, any>();
  const timeouts = new Map<string, NodeJS.Timeout>();

  const clearAll = () => {
    data.clear();
    timeouts.forEach(timeout => clearTimeout(timeout));
    timeouts.clear();
  };

  return {
    store: {
      keys: jest.fn().mockImplementation(async () => Array.from(data.keys())),
    },
    data,
    timeouts,
    get: jest.fn().mockImplementation(async (key: string) => {
      return data.get(key);
    }),
    set: jest.fn().mockImplementation(async (key: string, value: any, options?: any) => {
      data.set(key, value);

      // 处理TTL
      if (options?.ttl) {
        const existingTimeout = timeouts.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
          data.delete(key);
          timeouts.delete(key);
        }, options.ttl * 1000); // 转换为毫秒

        timeouts.set(key, timeout);
      }

      return true;
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      const deleted = data.has(key);
      data.delete(key);

      const timeout = timeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        timeouts.delete(key);
      }

      return deleted;
    }),
    reset: jest.fn().mockImplementation(async () => {
      clearAll();
      return true;
    }),
    wrap: jest.fn(),
  } as any;
}

/**
 * 创建带有模拟缓存的测试模块
 */
export async function createTestingModuleWithCache(providers: any[] = []) {
  const mockCacheManager = createMockCacheManager();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: CACHE_MANAGER,
        useValue: mockCacheManager,
      },
    ],
  }).compile();

  return { module, mockCacheManager };
}

/**
 * 创建测试用的执行上下文
 */
export function createMockExecutionContext(
  className: string,
  methodName: string,
  args: any[] = []
): jest.Mocked<ExecutionContext> {
  const mockHandler = { constructor: { name: className }, name: methodName };

  return {
    getHandler: jest.fn().mockReturnValue(mockHandler),
    getArgs: jest.fn().mockReturnValue(args),
    getClass: jest.fn().mockReturnValue({ name: className } as any),
    switchToHttp: jest.fn(),
    switchToWs: jest.fn(),
    switchToRpc: jest.fn(),
    getType: jest.fn().mockReturnValue('http'),
    getHandlerByIndex: jest.fn(),
    getArgByIndex: jest.fn(),
  } as any;
}

/**
 * 创建测试用的调用处理器
 */
export function createMockCallHandler(result: any, shouldError = false, delay = 0): jest.Mocked<CallHandler> {
  const handle = jest.fn();

  if (shouldError) {
    handle.mockReturnValue(throwError(new Error('Test error')));
  } else if (delay > 0) {
    handle.mockReturnValue(
      new Promise(resolve => setTimeout(() => resolve(result), delay))
    );
  } else {
    handle.mockReturnValue(Promise.resolve(result));
  }

  return {
    handle,
  } as any;
}

/**
 * 等待指定时间
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试辅助函数：验证缓存键格式
 */
export function expectValidCacheKey(cacheKey: string, className: string, methodName: string): void {
  expect(cacheKey).toMatch(/^method:/);
  expect(cacheKey).toContain(className);
  expect(cacheKey).toContain(methodName);
}

/**
 * 测试辅助函数：创建复杂的测试数据
 */
export function createComplexTestData(depth: number = 3): any {
  if (depth === 0) {
    return `leaf-${Math.random()}`;
  }

  return {
    id: Math.random().toString(36),
    name: `test-${Math.random()}`,
    nested: createComplexTestData(depth - 1),
    array: Array.from({ length: 3 }, () => Math.random()),
    date: new Date(),
    null: null,
    undefined: undefined,
  };
}

/**
 * 测试辅助函数：比较性能指标
 */
export interface PerformanceMetrics {
  cacheHitTime: number;
  cacheMissTime: number;
  improvement: number;
}

export function calculateCacheImprovement(cacheMissTime: number, cacheHitTime: number): PerformanceMetrics {
  const improvement = ((cacheMissTime - cacheHitTime) / cacheMissTime) * 100;

  return {
    cacheHitTime,
    cacheMissTime,
    improvement: Math.max(0, improvement), // 确保不为负数
  };
}

/**
 * 测试辅助函数：生成大量并发请求
 */
export async function generateConcurrentRequests<T>(
  requestFn: () => Promise<T>,
  count: number,
  delayBetweenRequests = 0
): Promise<T[]> {
  const promises: Promise<T>[] = [];

  for (let i = 0; i < count; i++) {
    if (delayBetweenRequests > 0 && i > 0) {
      await delay(delayBetweenRequests);
    }
    promises.push(requestFn());
  }

  return Promise.all(promises);
}

/**
 * 测试辅助函数：测量执行时间
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;

  return { result, executionTime };
}

/**
 * 测试辅助函数：创建带错误的缓存管理器
 */
export function createFailingCacheManager(
  failOnGet = false,
  failOnSet = false,
  failOnDel = false
): jest.Mocked<Cache> {
  const mockCache = createMockCacheManager();

  if (failOnGet) {
    mockCache.get.mockRejectedValue(new Error('Cache get failed'));
  }

  if (failOnSet) {
    mockCache.set.mockRejectedValue(new Error('Cache set failed'));
  }

  if (failOnDel) {
    mockCache.del.mockRejectedValue(new Error('Cache delete failed'));
  }

  return mockCache;
}

/**
 * 测试辅助函数：创建超时的缓存管理器
 */
export function createTimeoutCacheManager(timeoutMs = 100): jest.Mocked<Cache> {
  const mockCache = createMockCacheManager();

  mockCache.get.mockImplementation(() =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cache timeout')), timeoutMs)
    )
  );

  mockCache.set.mockImplementation(() =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cache set timeout')), timeoutMs)
    )
  );

  return mockCache;
}

/**
 * 清理测试数据的辅助函数
 */
export async function cleanupTestCache(mockCacheManager: any): Promise<void> {
  if (mockCacheManager?.reset) {
    await mockCacheManager.reset();
  }

  if (mockCacheManager?.data) {
    mockCacheManager.data.clear();
  }

  if (mockCacheManager?.timeouts) {
    mockCacheManager.timeouts.forEach(timeout => clearTimeout(timeout));
    mockCacheManager.timeouts.clear();
  }
}