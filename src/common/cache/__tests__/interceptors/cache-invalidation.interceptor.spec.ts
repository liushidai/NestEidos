import { Test, TestingModule } from '@nestjs/testing';
import { CacheInvalidationInterceptor } from '../../../interceptors/cache-invalidation.interceptor';
import { CacheManagementService } from '../../../services/cache-management.service';
import { Reflector } from '@nestjs/core';
import { getCacheInvalidationConfig } from '../../../decorators/cache-invalidation.decorator';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('CacheInvalidationInterceptor', () => {
  let interceptor: CacheInvalidationInterceptor;
  let mockCacheManagementService: jest.Mocked<CacheManagementService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationInterceptor,
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

    interceptor = module.get<CacheInvalidationInterceptor>(CacheInvalidationInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getClass: jest.fn(),
      } as any;

      mockCallHandler = {
        handle: jest.fn(),
      } as any;
    });

    it('should pass through when no invalidation config', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
      expect(result).toBe('test-result');
      expect(mockCacheManagementService.clearMethodCache).not.toHaveBeenCalled();
      expect(mockCacheManagementService.clearMethodCacheWithArgs).not.toHaveBeenCalled();
    });

    it('should clear caches with args.0 mapping on success', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123', { userName: 'testuser' }]);
      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['args.1.userName'] },
        ],
      });
      mockCallHandler.handle.mockReturnValue(of({ id: '123', userName: 'testuser' }));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findById',
        ['123']
      );
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findByUserName',
        ['testuser']
      );
    });

    it('should clear caches with result mapping on success', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123', { userName: 'newuser' }]);
      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['result.id'] },
          { methodName: 'findByEmail', paramMapping: ['result.email'] },
        ],
      });
      const resultData = { id: '123', email: 'test@example.com' };
      mockCallHandler.handle.mockReturnValue(of(resultData));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findById',
        ['123']
      );
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findByEmail',
        ['test@example.com']
      );
    });

    it('should handle clearAll flag', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findAll', clearAll: true }],
      });
      mockCallHandler.handle.mockReturnValue(of(['user1', 'user2']));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCache).toHaveBeenCalledWith('UserService', 'findAll');
    });

    it('should handle mixed param mappings (args and result)', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123', { userName: 'newuser' }]);
      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['result.userName', 'args.1.userName'] },
        ],
      });
      const resultData = { id: '123', userName: 'olduser' };
      mockCallHandler.handle.mockReturnValue(of(resultData));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findById',
        ['123']
      );
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findByUserName',
        ['olduser', 'newuser']
      );
    });

    it('should clear caches even when method fails', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123']);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });
      mockCallHandler.handle.mockReturnValue(throwError(new Error('Method failed')));

      await expect(interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise())
        .rejects.toThrow('Method failed');

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findById',
        ['123']
      );
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123']);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['args.0'] }],
      });
      mockCacheManagementService.clearMethodCacheWithArgs.mockRejectedValue(new Error('Cache error'));
      mockCallHandler.handle.mockReturnValue(of('success-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
      expect(result).toBe('success-result');
    });

    it('should handle empty param mapping', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'testMethod', paramMapping: [] }],
      });
      mockCallHandler.handle.mockReturnValue(of('result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'testMethod',
        []
      );
    });

    it('should handle fixed value mappings', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'testMethod', paramMapping: ['fixed-value'] }],
      });
      mockCallHandler.handle.mockReturnValue(of('result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'testMethod',
        ['fixed-value']
      );
    });

    it('should handle nested result paths', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findByUserDepartment', paramMapping: ['result.department.id'] }],
      });
      const resultData = { id: '123', department: { id: 'dept1', name: 'IT' } };
      mockCallHandler.handle.mockReturnValue(of(resultData));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findByUserDepartment',
        ['dept1']
      );
    });

    it('should handle undefined result values', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({
        entries: [{ methodName: 'findById', paramMapping: ['result.id'] }],
      });
      mockCallHandler.handle.mockReturnValue(of(null));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).not.toHaveBeenCalled();
    });

    it('should handle object parameter extraction', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue([{ id: '123', type: 'admin' }]);
      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.id'] },
          { methodName: 'findByType', paramMapping: ['args.type'] },
        ],
      });
      mockCallHandler.handle.mockReturnValue(of('result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findById',
        ['123']
      );
      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledWith(
        'UserService',
        'findByType',
        ['admin']
      );
    });

    it('should handle multiple cache clear operations in parallel', async () => {
      const mockHandler = { constructor: { name: 'UserService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123', { userName: 'test' }]);
      mockReflector.get.mockReturnValue({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['args.1.userName'] },
          { methodName: 'existsByUserName', paramMapping: ['args.1.userName'] },
          { methodName: 'findAll', clearAll: true },
        ],
      });
      mockCallHandler.handle.mockReturnValue(of('result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManagementService.clearMethodCacheWithArgs).toHaveBeenCalledTimes(3);
      expect(mockCacheManagementService.clearMethodCache).toHaveBeenCalledTimes(1);
    });
  });
});