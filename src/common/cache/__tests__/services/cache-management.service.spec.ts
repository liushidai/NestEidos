import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagementService } from '../../../services/cache-management.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('CacheManagementService', () => {
  let service: CacheManagementService;
  let mockCacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      wrap: jest.fn(),
      store: {
        keys: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheManagementService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheManagementService>(CacheManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('clearClassCache', () => {
    it('should clear all cache entries for a class', async () => {
      const mockKeys = [
        'method:UserService:findById:123',
        'method:UserService:findByEmail:test@example.com',
        'other:key:should:not:match',
        'method:UserService:findAll',
      ];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearClassCache('UserService');

      expect(mockCacheManager.store.keys).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findById:123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findByEmail:test@example.com');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findAll');
    });

    it('should not clear cache when no matching keys found', async () => {
      const mockKeys = ['other:key:pattern'];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);

      await service.clearClassCache('UserService');

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should handle cache store errors gracefully', async () => {
      mockCacheManager.store.keys.mockRejectedValue(new Error('Store error'));

      await service.clearClassCache('UserService');

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      const mockKeys = ['method:UserService:test:123'];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);
      mockCacheManager.del.mockRejectedValue(new Error('Delete error'));

      await service.clearClassCache('UserService');

      // Should not throw
    });
  });

  describe('clearMethodCache', () => {
    it('should clear cache entries for a specific method', async () => {
      const mockKeys = [
        'method:UserService:findById:123',
        'method:UserService:findById:456',
        'method:UserService:findByEmail:test@example.com',
        'method:UserService:findById:789',
      ];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearMethodCache('UserService', 'findById');

      expect(mockCacheManager.store.keys).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findById:123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findById:456');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findById:789');
    });

    it('should not clear cache when no method keys found', async () => {
      const mockKeys = ['method:UserService:findByEmail:test@example.com'];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);

      await service.clearMethodCache('UserService', 'findById');

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('clearMethodCacheWithArgs', () => {
    it('should clear cache entry for specific method arguments', async () => {
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearMethodCacheWithArgs('UserService', 'findById', ['123']);

      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findById:123');
    });

    it('should handle multiple arguments', async () => {
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearMethodCacheWithArgs('UserService', 'findUsers', ['active', 'admin', '2023']);

      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findUsers:active,admin,2023');
    });

    it('should handle empty arguments', async () => {
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearMethodCacheWithArgs('UserService', 'findAll', []);

      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findAll:');
    });

    it('should handle undefined and null arguments', async () => {
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearMethodCacheWithArgs('UserService', 'test', [undefined, null, 'value']);

      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:test:undefined,null,value');
    });

    it('should handle deletion errors gracefully', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

      await service.clearMethodCacheWithArgs('UserService', 'findById', ['123']);

      // Should not throw
    });
  });

  describe('clearAllMethodCache', () => {
    it('should clear all method cache entries', async () => {
      const mockKeys = [
        'method:UserService:findById:123',
        'method:ProductService:getAll',
        'method:UserService:findAll',
        'other:key:should:not:match',
        'method:OrderService:findById:456',
      ];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);
      mockCacheManager.del.mockResolvedValue(true);

      await service.clearAllMethodCache();

      expect(mockCacheManager.store.keys).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(4);
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findById:123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:ProductService:getAll');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:UserService:findAll');
      expect(mockCacheManager.del).toHaveBeenCalledWith('method:OrderService:findById:456');
    });

    it('should handle empty cache store', async () => {
      mockCacheManager.store.keys.mockResolvedValue([]);

      await service.clearAllMethodCache();

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('setCache', () => {
    it('should set cache with TTL', async () => {
      mockCacheManager.set.mockResolvedValue(true);

      await service.setCache('UserService', 'findById', ['123'], 'user-data', 3600);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'method:UserService:findById:123',
        'user-data',
        { ttl: 3600 }
      );
    });

    it('should handle cache setting errors', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Set failed'));

      await service.setCache('UserService', 'findById', ['123'], 'user-data', 3600);

      // Should not throw
    });
  });

  describe('getCache', () => {
    it('should get cache value', async () => {
      const mockValue = { id: '123', name: 'Test User' };
      mockCacheManager.get.mockResolvedValue(mockValue);

      const result = await service.getCache('UserService', 'findById', ['123']);

      expect(result).toBe(mockValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith('method:UserService:findById:123');
    });

    it('should return undefined for cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.getCache('UserService', 'findById', ['123']);

      expect(result).toBeUndefined();
    });

    it('should handle cache get errors', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Get failed'));

      const result = await service.getCache('UserService', 'findById', ['123']);

      expect(result).toBeUndefined();
    });
  });

  describe('hasCache', () => {
    it('should return true for existing cache', async () => {
      mockCacheManager.get.mockResolvedValue('some-value');

      const result = await service.hasCache('UserService', 'findById', ['123']);

      expect(result).toBe(true);
    });

    it('should return false for non-existing cache', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.hasCache('UserService', 'findById', ['123']);

      expect(result).toBe(false);
    });

    it('should return false on cache errors', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Get failed'));

      const result = await service.hasCache('UserService', 'findById', ['123']);

      expect(result).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockKeys = [
        'method:UserService:findById:123',
        'method:UserService:findByEmail:test@example.com',
        'method:ProductService:getAll',
      ];
      mockCacheManager.store.keys.mockResolvedValue(mockKeys);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 3,
        methodCacheKeys: 3,
      });
    });

    it('should handle empty cache store', async () => {
      mockCacheManager.store.keys.mockResolvedValue([]);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        methodCacheKeys: 0,
      });
    });

    it('should handle stats errors gracefully', async () => {
      mockCacheManager.store.keys.mockRejectedValue(new Error('Stats error'));

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        methodCacheKeys: 0,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing cache store', async () => {
      mockCacheManager.store = null;

      await expect(service.clearClassCache('UserService')).resolves.toBeUndefined();
      await expect(service.clearMethodCache('UserService', 'findById')).resolves.toBeUndefined();
      await expect(service.clearAllMethodCache()).resolves.toBeUndefined();
      await expect(service.getCacheStats()).resolves.toEqual({
        totalKeys: 0,
        methodCacheKeys: 0,
      });
    });

    it('should handle cache store without keys method', async () => {
      mockCacheManager.store = {};

      await expect(service.clearClassCache('UserService')).resolves.toBeUndefined();
      await expect(service.clearMethodCache('UserService', 'findById')).resolves.toBeUndefined();
      await expect(service.clearAllMethodCache()).resolves.toBeUndefined();
      await expect(service.getCacheStats()).resolves.toEqual({
        totalKeys: 0,
        methodCacheKeys: 0,
      });
    });
  });
});