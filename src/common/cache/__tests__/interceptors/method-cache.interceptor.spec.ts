import { Test, TestingModule } from '@nestjs/testing';
import { MethodCacheInterceptor } from '../../../interceptors/method-cache.interceptor';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { getCacheableMetadata } from '../../../decorators/cacheable.decorator';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('MethodCacheInterceptor', () => {
  let interceptor: MethodCacheInterceptor;
  let mockCacheManager: jest.Mocked<any>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockReflector = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MethodCacheInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<MethodCacheInterceptor>(MethodCacheInterceptor);
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

    it('should pass through when no cache metadata', async () => {
      mockReflector.get.mockReturnValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
      expect(result).toBe('test-result');
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should return cached value when cache exists', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123']);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue('cached-result');

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe('cached-result');
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should execute handler and cache result when cache miss', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123']);
      mockReflector.get.mockReturnValue({ ttl: 1800, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCallHandler.handle.mockReturnValue(of('fresh-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe('fresh-result');
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('TestService'),
        'fresh-result',
        expect.any(Object)
      );
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should not cache when disabled flag is true', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({ disabled: true });
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe('test-result');
      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));
      mockCallHandler.handle.mockReturnValue(of('fallback-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe('fallback-result');
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockRejectedValue(new Error('Cache set error'));
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(result).toBe('test-result');
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should use custom TTL from metadata', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123']);
      mockReflector.get.mockReturnValue({ ttl: 7200, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        'test-result',
        expect.objectContaining({ ttl: 7200 })
      );
    });

    it('should generate correct cache key format', async () => {
      const mockHandler = { name: 'testMethod', constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['123', { type: 'user' }]);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManager.get).toHaveBeenCalledWith('method:TestService:testMethod:123,{"type":"user"}');
    });

    it('should handle multiple arguments correctly', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue(['arg1', 'arg2', 'arg3']);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManager.get).toHaveBeenCalledWith('method:TestService:method:arg1,arg2,arg3');
    });

    it('should handle undefined arguments', async () => {
      const mockHandler = { constructor: { name: 'TestService' } };
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getArgs.mockReturnValue([undefined, null, 'defined']);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManager.get).toHaveBeenCalledWith('method:TestService:method:undefined,null,defined');
    });

    it('should handle symbol method names', async () => {
      const symbolMethod = Symbol('testMethod');
      const mockHandler = { constructor: { name: 'TestService' } };
      mockHandler.name = symbolMethod;
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockReflector.get.mockReturnValue({ ttl: 3600, disabled: false });
      mockCacheManager.get.mockResolvedValue(null);
      mockCallHandler.handle.mockReturnValue(of('test-result'));

      await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('TestService')
      );
    });
  });
});