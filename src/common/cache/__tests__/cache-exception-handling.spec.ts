import { Test, TestingModule } from '@nestjs/testing';
import { MethodCacheInterceptor } from '../interceptors/method-cache.interceptor';
import { CacheInvalidationInterceptor } from '../interceptors/cache-invalidation.interceptor';
import { CacheManagementService } from '../services/cache-management.service';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('Cache Exception Handling Tests', () => {
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
      clearClassCache: jest.fn(),
      clearAllMethodCache: jest.fn(),
      setCache: jest.fn(),
      getCache: jest.fn(),
      hasCache: jest.fn(),
      getCacheStats: jest.fn(),
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

  describe('Method Cache Exception Handling', () => {
    it('should handle cache get errors gracefully', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockRejectedValue(new Error('Cache get failed'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Test User' })),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual({ id: '123', name: 'Test User' });
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null); // Cache miss
      mockCacheManager.set.mockRejectedValue(new Error('Cache set failed'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Test User' })),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual({ id: '123', name: 'Test User' });
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle method execution errors without affecting cache', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null); // Cache miss

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(throwError(new Error('Method execution failed'))),
      };

      await expect(
        methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise()
      ).rejects.toThrow('Method execution failed');

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle both cache and method errors', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockRejectedValue(new Error('Cache get failed'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(throwError(new Error('Method execution failed'))),
      };

      await expect(
        methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise()
      ).rejects.toThrow('Method execution failed');

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle timeout scenarios', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });

      // Simulate cache timeout
      mockCacheManager.get.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Cache timeout')), 100);
        });
      });

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Test User' })),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual({ id: '123', name: 'Test User' });
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle corrupted cache data', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue('corrupted-data-not-json');

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Fresh Data' })),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Should return corrupted data as-is, without attempting to parse
      expect(result).toBe('corrupted-data-not-json');
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation Exception Handling', () => {
    it('should handle cache invalidation errors on method success', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });

      mockCacheManagementService.clearMethodCacheWithArgs.mockRejectedValue(new Error('Cache invalidation failed'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Updated User' })),
      };

      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Should still return the method result despite cache invalidation failure
      expect(result).toEqual({ id: '123', name: 'Updated User' });
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalled();
    });

    it('should handle cache invalidation errors on method failure', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });

      mockCacheManagementService.clearMethodCacheWithArgs.mockRejectedValue(new Error('Cache invalidation failed'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(throwError(new Error('Method execution failed'))),
      };

      await expect(
        cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise()
      ).rejects.toThrow('Method execution failed');

      // Should still attempt cache invalidation despite method failure
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalled();
    });

    it('should handle partial cache invalidation failures', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123', { userName: 'test' }],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['args.1.userName'] },
          { methodName: 'findAll', clearAll: true },
        ],
      });

      // Simulate partial failures
      mockCacheManagementService.clearMethodCacheWithArgs
        .mockResolvedValueOnce(true) // First succeeds
        .mockRejectedValueOnce(new Error('Second invalidation failed')) // Second fails
        .mockResolvedValueOnce(true); // Third succeeds

      mockCacheManagementService.clearMethodCache.mockResolvedValue(true);

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', userName: 'test' })),
      };

      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Should still complete successfully
      expect(result).toEqual({ id: '123', userName: 'test' });
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledTimes(2);
      expect(mockCacheManagementService.clearMethodCache).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout in cache invalidation', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });

      // Simulate cache invalidation timeout
      mockCacheManagementService.clearMethodCacheWithArgs.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Cache invalidation timeout')), 100);
        });
      });

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Updated User' })),
      };

      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      // Should still complete despite timeout
      expect(result).toEqual({ id: '123', name: 'Updated User' });
    });
  });

  describe('Cache Management Service Exception Handling', () => {
    it('should handle errors in clearClassCache', async () => {
      mockCacheManager.store = {
        keys: jest.fn().mockRejectedValue(new Error('Store access failed')),
      };

      const service = module.get<CacheManagementService>(CacheManagementService);

      await expect(service.clearClassCache('UserService')).resolves.toBeUndefined();
    });

    it('should handle errors in clearMethodCache', async () => {
      mockCacheManager.store = {
        keys: jest.fn().mockRejectedValue(new Error('Keys retrieval failed')),
      };

      const service = module.get<CacheManagementService>(CacheManagementService);

      await expect(service.clearMethodCache('UserService', 'findById')).resolves.toBeUndefined();
    });

    it('should handle errors in clearMethodCacheWithArgs', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Delete operation failed'));

      const service = module.get<CacheManagementService>(CacheManagementService);

      await expect(service.clearMethodCacheWithArgs('UserService', 'findById', ['123'])).resolves.toBeUndefined();
    });

    it('should handle errors in setCache', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Set operation failed'));

      const service = module.get<CacheManagementService>(CacheManagementService);

      await expect(service.setCache('UserService', 'findById', ['123'], 'data', 3600)).resolves.toBeUndefined();
    });

    it('should handle errors in getCache', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Get operation failed'));

      const service = module.get<CacheManagementService>(CacheManagementService);

      const result = await service.getCache('UserService', 'findById', ['123']);
      expect(result).toBeUndefined();
    });

    it('should handle errors in hasCache', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Has check failed'));

      const service = module.get<CacheManagementService>(CacheManagementService);

      const result = await service.hasCache('UserService', 'findById', ['123']);
      expect(result).toBe(false);
    });

    it('should handle errors in getCacheStats', async () => {
      mockCacheManager.store = {
        keys: jest.fn().mockRejectedValue(new Error('Stats retrieval failed')),
      };

      const service = module.get<CacheManagementService>(CacheManagementService);

      const stats = await service.getCacheStats();
      expect(stats).toEqual({
        totalKeys: 0,
        methodCacheKeys: 0,
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle null/undefined cache manager', async () => {
      const moduleWithNullCache = await Test.createTestingModule({
        providers: [
          CacheManagementService,
          {
            provide: CACHE_MANAGER,
            useValue: null,
          },
        ],
      }).compile();

      const service = moduleWithNullCache.get<CacheManagementService>(CacheManagementService);

      // Should not throw errors
      await expect(service.clearClassCache('UserService')).resolves.toBeUndefined();
      await expect(service.getCache('UserService', 'test', ['123'])).resolves.toBeUndefined();
      await expect(service.setCache('UserService', 'test', ['123'], 'data', 3600)).resolves.toBeUndefined();
    });

    it('should handle malformed cache keys', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => [null, undefined, { toString: () => null }, 'normal'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('result')),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe('result');
      expect(mockCacheManager.get).toHaveBeenCalled();
    });

    it('should handle extremely large cache values', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);

      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      mockCacheManager.set.mockRejectedValue(new Error('Data too large'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(largeData)),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe(largeData);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should handle circular reference in cache data', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);

      // Create circular reference
      const circularData: any = { id: '123' };
      circularData.self = circularData;

      mockCacheManager.set.mockRejectedValue(new Error('Circular reference error'));

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(circularData)),
      };

      const result = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe(circularData);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});

// Mock class for testing
class UserService {}