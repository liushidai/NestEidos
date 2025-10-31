import { Test, TestingModule } from '@nestjs/testing';
import { CacheInvalidationInterceptor } from '../interceptors/cache-invalidation.interceptor';
import { MethodCacheInterceptor } from '../interceptors/method-cache.interceptor';
import { CacheManagementService } from '../services/cache-management.service';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('Cache Invalidation Integration Tests', () => {
  let module: TestingModule;
  let cacheInvalidationInterceptor: CacheInvalidationInterceptor;
  let methodCacheInterceptor: MethodCacheInterceptor;
  let mockCacheManager: jest.Mocked<any>;
  let mockCacheManagementService: jest.Mocked<CacheManagementService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        keys: jest.fn(),
      },
    };

    mockCacheManagementService = {
      clearMethodCache: jest.fn(),
      clearMethodCacheWithArgs: jest.fn(),
      clearClassCache: jest.fn(),
      clearAllMethodCache: jest.fn(),
    } as any;

    mockReflector = {
      get: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        CacheInvalidationInterceptor,
        MethodCacheInterceptor,
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

    cacheInvalidationInterceptor = module.get<CacheInvalidationInterceptor>(CacheInvalidationInterceptor);
    methodCacheInterceptor = module.get<MethodCacheInterceptor>(MethodCacheInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Hit/Miss and Invalidation', () => {
    it('should cache result on first call and invalidate on update', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => mockHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      // First call - cache miss
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(true);

      const mockCallHandler1 = { handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Test' })) };
      const result1 = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler1).toPromise();

      expect(result1).toEqual({ id: '123', name: 'Test' });
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();

      // Second call - cache hit
      mockCacheManager.get.mockResolvedValue({ id: '123', name: 'Test' });
      const mockCallHandler2 = { handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Test' })) };
      const result2 = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler2).toPromise();

      expect(result2).toEqual({ id: '123', name: 'Test' });
      expect(mockCallHandler2.handle).not.toHaveBeenCalled();

      // Update operation - should invalidate cache
      const updateHandler = { name: 'update', constructor: { name: 'UserService' } };
      const updateExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123', { name: 'Updated Name' }],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });
      mockCacheManagementService.clearMethodCacheWithArgs.mockResolvedValue(true);

      const updateCallHandler = { handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Updated Name' })) };
      const updateResult = await cacheInvalidationInterceptor.intercept(updateExecutionContext, updateCallHandler).toPromise();

      expect(updateResult).toEqual({ id: '123', name: 'Updated Name' });
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findById', ['123']);

      // Third call - should be cache miss again
      mockCacheManager.get.mockResolvedValue(null);
      const mockCallHandler3 = { handle: jest.fn().mockReturnValue(of({ id: '123', name: 'Updated Name' })) };
      const result3 = await methodCacheInterceptor.intercept(mockExecutionContext, mockCallHandler3).toPromise();

      expect(result3).toEqual({ id: '123', name: 'Updated Name' });
      expect(mockCallHandler3.handle).toHaveBeenCalled();
    });
  });

  describe('Complex Invalidation Scenarios', () => {
    it('should handle multiple method invalidations', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123', { userName: 'newuser', email: 'new@example.com' }],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['result.userName', 'args.1.userName'] },
          { methodName: 'findByEmail', paramMapping: ['result.email', 'args.1.email'] },
          { methodName: 'findAll', clearAll: true },
        ],
      });

      const resultData = { id: '123', userName: 'olduser', email: 'old@example.com' };
      mockCacheManagementService.clearMethodCacheWithArgs.mockResolvedValue(true);
      mockCacheManagementService.clearMethodCache.mockResolvedValue(true);

      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(resultData)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual(resultData);

      // Verify all invalidation calls
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findById', ['123']);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findByUserName', ['olduser', 'newuser']);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findByEmail', ['old@example.com', 'new@example.com']);
      expect(mockCacheManagementService.clearMethodCache).toHaveBeenCalledWith('UserService', 'findAll');
    });

    it('should handle nested result paths in invalidation', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findByDepartment', paramMapping: ['result.department.id'] },
          { methodName: 'findByLocation', paramMapping: ['result.department.location.id'] },
        ],
      });

      const resultData = {
        id: '123',
        department: {
          id: 'dept1',
          name: 'IT',
          location: {
            id: 'loc1',
            name: 'Building A',
          },
        },
      };

      mockCacheManagementService.clearMethodCacheWithArgs.mockResolvedValue(true);
      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(resultData)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual(resultData);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findByDepartment', ['dept1']);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findByLocation', ['loc1']);
    });

    it('should handle invalidation when result is null', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['result.id'] },
          { methodName: 'findAll', clearAll: true },
        ],
      });

      mockCacheManagementService.clearMethodCache.mockResolvedValue(true);
      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(null)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBeNull();
      expect(mockCacheManagementService.clearMethodCacheWithArgs).not.toHaveBeenCalled();
      expect(mockCacheManagementService.clearMethodCache).toHaveBeenCalledWith('UserService', 'findAll');
    });
  });

  describe('Error Handling in Invalidation', () => {
    it('should continue execution even if cache invalidation fails', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });

      mockCacheManagementService.clearMethodCacheWithArgs.mockRejectedValue(new Error('Cache clear failed'));
      const resultData = { id: '123', name: 'Test' };
      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(resultData)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual(resultData);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalled();
    });

    it('should attempt cache invalidation even when method fails', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });

      mockCacheManagementService.clearMethodCacheWithArgs.mockResolvedValue(true);
      const mockCallHandler = { handle: jest.fn().mockReturnValue(throwError(new Error('Method failed'))) };

      await expect(cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise())
        .rejects.toThrow('Method failed');

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'findById', ['123']);
    });

    it('should handle mixed success and failure in cache operations', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByEmail', paramMapping: ['result.email'] },
        ],
      });

      mockCacheManagementService.clearMethodCacheWithArgs
        .mockResolvedValueOnce(true) // First call succeeds
        .mockRejectedValueOnce(new Error('Second cache clear failed')); // Second call fails

      const resultData = { id: '123', email: 'test@example.com' };
      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(resultData)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual(resultData);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty invalidation configuration', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123'],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({ entries: [] });

      const resultData = { id: '123' };
      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(resultData)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual(resultData);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).not.toHaveBeenCalled();
    });

    it('should handle undefined param mappings', async () => {
      const updateHandler = { constructor: { name: 'UserService' } };
      const mockExecutionContext = {
        getHandler: () => updateHandler,
        getArgs: () => ['123', undefined, null],
        getClass: () => UserService,
      } as any;

      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'test1', paramMapping: ['args.0'] },
          { methodName: 'test2', paramMapping: ['args.1'] },
          { methodName: 'test3', paramMapping: ['args.2'] },
        ],
      });

      mockCacheManagementService.clearMethodCacheWithArgs.mockResolvedValue(true);
      const resultData = { id: '123' };
      const mockCallHandler = { handle: jest.fn().mockReturnValue(of(resultData)) };
      const result = await cacheInvalidationInterceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toEqual(resultData);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'test1', ['123']);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'test2', [undefined]);
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith('UserService', 'test3', [null]);
    });
  });
});

// Mock class for testing
class UserService {}