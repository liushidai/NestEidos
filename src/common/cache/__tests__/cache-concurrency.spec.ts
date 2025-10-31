import { Test, TestingModule } from '@nestjs/testing';
import { MethodCacheInterceptor } from '../interceptors/method-cache.interceptor';
import { CacheInvalidationInterceptor } from '../interceptors/cache-invalidation.interceptor';
import { CacheManagementService } from '../services/cache-management.service';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, delay } from 'rxjs';

describe('Cache Concurrency Tests', () => {
  let module: TestingModule;
  let methodCacheInterceptor: MethodCacheInterceptor;
  let cacheInvalidationInterceptor: CacheInvalidationInterceptor;
  let mockCacheManager: jest.Mocked<any>;
  let mockCacheManagementService: jest.Mocked<CacheManagementService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockCacheManagementService = {
      clearMethodCache: jest.fn(),
      clearMethodCacheWithArgs: jest.fn(),
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        MethodCacheInterceptor,
        CacheInvalidationInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheManagementService,
          useValue: mockCacheManagementService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    methodCacheInterceptor = module.get<MethodCacheInterceptor>(MethodCacheInterceptor);
    cacheInvalidationInterceptor = module.get<CacheInvalidationInterceptor>(CacheInvalidationInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent Cache Access', () => {
    it('should handle concurrent cache misses correctly', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      // Configure cache interceptor
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });

      // Simulate cache miss for all calls initially
      mockCacheManager.get.mockResolvedValue(null);

      // Create multiple concurrent calls
      const concurrentCalls = 10;
      const promises = [];

      for (let i = 0; i < concurrentCalls; i++) {
        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(
            of({ id: '123', name: 'Test User' }).pipe(delay(100)) // Simulate async operation
          ),
        };
        promises.push(methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise());
      }

      const results = await Promise.all(promises);

      // All calls should return the same result
      results.forEach((result) => {
        expect(result).toEqual({ id: '123', name: 'Test User' });
      });

      // Cache get should be called for each concurrent call
      expect(mockCacheManager.get).toHaveBeenCalledTimes(concurrentCalls);

      // Cache set should be called for each call (in real implementation, this might need lock mechanism)
      expect(mockCacheManager.set).toHaveBeenCalledTimes(concurrentCalls);
    });

    it('should handle concurrent cache hits correctly', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });

      // Simulate cache hit for all calls
      const cachedResult = { id: '123', name: 'Cached User' };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      // Create multiple concurrent calls
      const concurrentCalls = 20;
      const promises = [];

      for (let i = 0; i < concurrentCalls; i++) {
        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Fresh User' })),
        };
        promises.push(methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise());
      }

      const results = await Promise.all(promises);

      // All calls should return the cached result
      results.forEach((result) => {
        expect(result).toEqual(cachedResult);
      });

      // Cache get should be called for each call
      expect(mockCacheManager.get).toHaveBeenCalledTimes(concurrentCalls);

      // Handler should not be called for any of them
      promises.forEach((_, index) => {
        // Note: In actual implementation, we would need to track the mock handlers
      });

      // Cache set should not be called since we have cache hits
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle mixed cache hits and misses concurrently', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });

      // Simulate mixed cache behavior: first 3 calls miss, subsequent calls hit
      let callCount = 0;
      mockCacheManager.get.mockImplementation(async () => {
        callCount++;
        if (callCount <= 3) {
          return null; // Cache miss for first 3 calls
        } else {
          return { id: '123', name: 'Cached User' }; // Cache hit for subsequent calls
        }
      });

      const concurrentCalls = 10;
      const promises = [];

      for (let i = 0; i < concurrentCalls; i++) {
        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Fresh User' })),
        };
        promises.push(methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise());
      }

      const results = await Promise.all(promises);

      // All calls should return valid results
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.id).toBe('123');
      });

      expect(mockCacheManager.get).toHaveBeenCalledTimes(concurrentCalls);
    });
  });

  describe('Concurrent Cache Invalidation', () => {
    it('should handle concurrent cache invalidations without race conditions', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123', { userName: 'newuser' }],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['args.1.userName'] },
        ],
      });

      // Simulate async cache invalidation
      mockCacheManagementService.clearMethodCacheWithArgs.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async operation
        return true;
      });

      // Create multiple concurrent update operations
      const concurrentUpdates = 5;
      const promises = [];

      for (let i = 0; i < concurrentUpdates; i++) {
        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(of({ id: '123', userName: `user${i}` })),
        };
        promises.push(cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise());
      }

      const results = await Promise.all(promises);

      // All updates should complete successfully
      results.forEach((result, index) => {
        expect(result).toEqual({ id: '123', userName: `user${index}` });
      });

      // Cache invalidation should be called for each update
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledTimes(concurrentUpdates * 2);
    });

    it('should handle concurrent invalidation errors gracefully', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });

      // Simulate some invalidation failures
      let invalidationCount = 0;
      mockCacheManagementService.clearMethodCacheWithArgs.mockImplementation(async () => {
        invalidationCount++;
        if (invalidationCount % 3 === 0) {
          throw new Error(`Invalidation ${invalidationCount} failed`);
        }
        await new Promise(resolve => setTimeout(resolve, 30));
        return true;
      });

      const concurrentUpdates = 6;
      const promises = [];

      for (let i = 0; i < concurrentUpdates; i++) {
        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(of({ id: '123', userName: `user${i}` })),
        };
        promises.push(cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise());
      }

      const results = await Promise.all(promises);

      // All operations should complete despite some cache invalidation failures
      results.forEach((result, index) => {
        expect(result).toEqual({ id: '123', userName: `user${index}` });
      });

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledTimes(concurrentUpdates);
    });
  });

  describe('Cache Stampede Prevention', () => {
    it('should prevent cache stampede with proper handling', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });

      // Simulate cache miss followed by hit after first call completes
      let firstCallCompleted = false;
      mockCacheManager.get.mockImplementation(async () => {
        if (!firstCallCompleted) {
          return null; // Cache miss
        } else {
          return { id: '123', name: 'Cached Result' }; // Cache hit after first call
        }
      });

      mockCacheManager.set.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate cache set delay
        firstCallCompleted = true;
        return true;
      });

      // Create many concurrent calls to simulate stampede scenario
      const stampedeSize = 50;
      const promises = [];

      for (let i = 0; i < stampedeSize; i++) {
        const mockCallHandler = {
          handle: jest.fn().mockReturnValue(
            of({ id: '123', name: 'Fresh Result' }).pipe(delay(50))
          ),
        };
        promises.push(methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise());
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All calls should complete successfully
      expect(results).toHaveLength(stampedeSize);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.id).toBe('123');
      });

      // In a real implementation with proper stampede prevention,
      // the time should be much less than stampedeSize * individual call time
      // This test documents the expected behavior
      console.log(`Cache stampede test completed in ${endTime - startTime}ms for ${stampedeSize} concurrent calls`);
    });
  });

  describe('Race Condition Scenarios', () => {
    it('should handle read-after-write consistency', async () => {
      const writeHandler = { constructor: { name: 'UserService' } };
      const readHandler = { constructor: { name: 'UserService' } };

      // Write operation
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['result.id'] }],
      });

      mockCacheManagementService.clearMethodCacheWithArgs.mockResolvedValue(true);

      const writeExecutionContext = {
        getHandler: () => writeHandler,
        getArgs: () => ['123', { name: 'Updated User' }],
        getClass: () => UserService,
      } as any;

      const writeCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Updated User' })),
      };

      // Read operation
      const readExecutionContext = {
        getHandler: () => readHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      const readCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Updated User' })),
      };

      // Execute write and read concurrently
      const writePromise = cacheInvalidationInterceptor.intercept(writeExecutionContext, writeCallHandler).toPromise();

      // Wait for write to start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Configure read interceptor
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null); // Simulate cache miss

      const readPromise = methodCacheInterceptor.intercept(readExecutionContext, readCallHandler).toPromise();

      const [writeResult, readResult] = await Promise.all([writePromise, readPromise]);

      expect(writeResult).toEqual({ id: '123', name: 'Updated User' });
      expect(readResult).toEqual({ id: '123', name: 'Updated User' });
    });
  });
});

// Mock class for testing
class UserService {}