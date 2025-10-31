import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '../cache.module';
import { CacheManagementService } from '../services/cache-management.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cacheable, DEFAULT_TTL_CONFIG, CacheInvalidation } from '../index';
import { Injectable } from '@nestjs/common';

// Test services for integration testing
@Injectable()
class TestUserService {
  private users = new Map<string, any>();

  constructor(private readonly cacheManagementService: CacheManagementService) {
    // Initialize test data
    this.users.set('1', { id: '1', name: 'John Doe', email: 'john@example.com' });
    this.users.set('2', { id: '2', name: 'Jane Smith', email: 'jane@example.com' });
  }

  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findById(id: string): Promise<any> {
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.users.get(id) || null;
  }

  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findByEmail(email: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 50));
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
  async findAll(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return Array.from(this.users.values());
  }

  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['result.id'] },
      { methodName: 'findByEmail', paramMapping: ['result.email'] },
      { methodName: 'findAll', clearAll: true }
    ]
  })
  async create(userData: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 30));
    const newUser = { id: (this.users.size + 1).toString(), ...userData };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] },
      { methodName: 'findByEmail', paramMapping: ['result.email', 'args.1.email'] },
      { methodName: 'findAll', clearAll: true }
    ]
  })
  async update(id: string, userData: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 30));
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User not found: ${id}`);
    }
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] },
      { methodName: 'findByEmail', paramMapping: ['result.email'] },
      { methodName: 'findAll', clearAll: true }
    ]
  })
  async delete(id: string): Promise<{ deleted: boolean; email?: string }> {
    await new Promise(resolve => setTimeout(resolve, 30));
    const user = this.users.get(id);
    const deleted = this.users.delete(id);
    return { deleted, email: user?.email };
  }

  // Utility method for testing
  clearData(): void {
    this.users.clear();
  }

  // Utility method to check data size
  getDataSize(): number {
    return this.users.size;
  }
}

@Injectable()
class TestProductService {
  private products = new Map<string, any>();

  constructor() {
    this.products.set('p1', { id: 'p1', name: 'Laptop', price: 999 });
    this.products.set('p2', { id: 'p2', name: 'Mouse', price: 29 });
  }

  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.MEDIUM })
  async findById(id: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 40));
    return this.products.get(id) || null;
  }

  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
  async findExpensive(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 60));
    return Array.from(this.products.values()).filter(p => p.price > 100);
  }
}

describe('Cache E2E Integration Tests', () => {
  let module: TestingModule;
  let userService: TestUserService;
  let productService: TestProductService;
  let cacheManagementService: CacheManagementService;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    // Create a more comprehensive mock cache manager
    const mockCacheStore = new Map<string, any>();
    let cacheTimeouts = new Map<string, NodeJS.Timeout>();

    cacheManager = {
      store: {
        keys: jest.fn().mockImplementation(async () => Array.from(mockCacheStore.keys())),
      },
      get: jest.fn().mockImplementation(async (key: string) => {
        return mockCacheStore.get(key);
      }),
      set: jest.fn().mockImplementation(async (key: string, value: any, options?: any) => {
        mockCacheStore.set(key, value);

        // Handle TTL if provided
        if (options?.ttl) {
          const existingTimeout = cacheTimeouts.get(key);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(() => {
            mockCacheStore.delete(key);
            cacheTimeouts.delete(key);
          }, options.ttl * 1000);

          cacheTimeouts.set(key, timeout);
        }

        return true;
      }),
      del: jest.fn().mockImplementation(async (key: string) => {
        const deleted = mockCacheStore.has(key);
        mockCacheStore.delete(key);

        const timeout = cacheTimeouts.get(key);
        if (timeout) {
          clearTimeout(timeout);
          cacheTimeouts.delete(key);
        }

        return deleted;
      }),
      reset: jest.fn().mockImplementation(async () => {
        mockCacheStore.clear();
        cacheTimeouts.forEach(timeout => clearTimeout(timeout));
        cacheTimeouts.clear();
        return true;
      }),
    } as any;

    module = await Test.createTestingModule({
      imports: [
        CacheModule,
      ],
      providers: [
        TestUserService,
        TestProductService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    userService = module.get<TestUserService>(TestUserService);
    productService = module.get<TestProductService>(TestProductService);
    cacheManagementService = module.get<CacheManagementService>(CacheManagementService);
  });

  afterEach(async () => {
    // Clean up cache
    await cacheManager.reset();
    userService.clearData();
  });

  describe('Basic Cache Operations', () => {
    it('should cache and retrieve user data correctly', async () => {
      // First call - cache miss
      const startTime1 = Date.now();
      const user1 = await userService.findById('1');
      const endTime1 = Date.now();

      expect(user1).toEqual({ id: '1', name: 'John Doe', email: 'john@example.com' });
      expect(endTime1 - startTime1).toBeGreaterThanOrEqual(40); // Should take time due to setTimeout
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();

      // Second call - cache hit
      const startTime2 = Date.now();
      const user2 = await userService.findById('1');
      const endTime2 = Date.now();

      expect(user2).toEqual({ id: '1', name: 'John Doe', email: 'john@example.com' });
      expect(endTime2 - startTime2).toBeLessThan(20); // Should be faster due to cache
    });

    it('should cache results for different services independently', async () => {
      const user = await userService.findById('1');
      const product = await productService.findById('p1');

      expect(user).toBeDefined();
      expect(product).toBeDefined();

      // Verify both services used cache
      expect(cacheManager.set).toHaveBeenCalledTimes(2);

      // Verify cache keys are different
      const setCalls = (cacheManager.set as jest.Mock).mock.calls;
      const userCacheKey = setCalls.find(call => call[0].includes('TestUserService'))?.[0];
      const productCacheKey = setCalls.find(call => call[0].includes('TestProductService'))?.[0];

      expect(userCacheKey).toBeDefined();
      expect(productCacheKey).toBeDefined();
      expect(userCacheKey).not.toBe(productCacheKey);
    });
  });

  describe('Cache Invalidation Integration', () => {
    it('should invalidate cache when creating new user', async () => {
      // Cache existing data
      await userService.findAll();
      await userService.findById('1');
      await userService.findByEmail('john@example.com');

      // Verify cache is populated
      expect(cacheManager.set).toHaveBeenCalledTimes(3);

      // Create new user (should invalidate relevant caches)
      const newUser = await userService.create({
        name: 'Alice Johnson',
        email: 'alice@example.com'
      });

      expect(newUser).toEqual({
        id: '3',
        name: 'Alice Johnson',
        email: 'alice@example.com'
      });

      // Verify cache invalidation was called
      expect(cacheManager.del).toHaveBeenCalledTimes(3);

      // Subsequent calls should hit database again
      const allUsers = await userService.findAll();
      expect(allUsers).toHaveLength(3);
    });

    it('should handle complex cache invalidation scenarios', async () => {
      // Cache initial data
      await userService.findById('1');
      await userService.findByEmail('john@example.com');
      await userService.findAll();

      // Update user with email change
      const updatedUser = await userService.update('1', {
        name: 'John Updated',
        email: 'john.updated@example.com'
      });

      expect(updatedUser.email).toBe('john.updated@example.com');

      // Should invalidate both old and new email caches
      expect(cacheManager.del).toHaveBeenCalledTimes(3); // findById, findByEmail (old), findByEmail (new), findAll

      // Verify updated data is returned
      const userById = await userService.findById('1');
      const userByOldEmail = await userService.findByEmail('john@example.com');
      const userByNewEmail = await userService.findByEmail('john.updated@example.com');

      expect(userById.email).toBe('john.updated@example.com');
      expect(userByOldEmail).toBeNull(); // Old email should not exist
      expect(userByNewEmail.email).toBe('john.updated@example.com');
    });

    it('should handle cache invalidation on delete operations', async () => {
      // Cache initial data
      await userService.findById('1');
      await userService.findByEmail('john@example.com');
      await userService.findAll();

      // Delete user
      const deleteResult = await userService.delete('1');
      expect(deleteResult.deleted).toBe(true);
      expect(deleteResult.email).toBe('john@example.com');

      // Verify cache invalidation
      expect(cacheManager.del).toHaveBeenCalledTimes(3);

      // Verify user is no longer found
      const user = await userService.findById('1');
      expect(user).toBeNull();

      const allUsers = await userService.findAll();
      expect(allUsers).toHaveLength(1); // Only user '2' should remain
    });
  });

  describe('Cross-Service Cache Behavior', () => {
    it('should maintain separate cache spaces for different services', async () => {
      // Access data from both services
      const user = await userService.findById('1');
      const product = await productService.findById('p1');
      const expensiveProducts = await productService.findExpensive();

      expect(user).toBeDefined();
      expect(product).toBeDefined();
      expect(expensiveProducts).toHaveLength(1);

      // Update user (should not affect product cache)
      await userService.update('1', { name: 'John Updated' });

      // Product cache should still be valid
      const cachedProduct = await productService.findById('p1');
      expect(cachedProduct).toEqual(product);

      // User cache should be invalidated
      const updatedUser = await userService.findById('1');
      expect(updatedUser.name).toBe('John Updated');
    });

    it('should handle concurrent operations across services', async () => {
      const promises = [
        userService.findById('1'),
        userService.findByEmail('jane@example.com'),
        productService.findById('p1'),
        productService.findExpensive(),
        userService.findAll(),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBeDefined(); // user
      expect(results[1]).toBeDefined(); // user by email
      expect(results[2]).toBeDefined(); // product
      expect(results[3]).toHaveLength(1); // expensive products
      expect(results[4]).toHaveLength(2); // all users

      // All operations should have been cached
      expect(cacheManager.set).toHaveBeenCalledTimes(5);
    });
  });

  describe('Cache Performance and TTL', () => {
    it('should respect different TTL configurations', async () => {
      // Test different TTL settings
      await userService.findById('1'); // DEFAULT_TTL (3600s)
      await userService.findAll(); // SHORT_TTL (300s)
      await productService.findById('p1'); // MEDIUM_TTL (1800s)

      const setCalls = (cacheManager.set as jest.Mock).mock_calls;

      // Verify TTL values are applied correctly
      expect(setCalls[0][2]).toEqual(expect.objectContaining({ ttl: 3600 }));
      expect(setCalls[1][2]).toEqual(expect.objectContaining({ ttl: 300 }));
      expect(setCalls[2][2]).toEqual(expect.objectContaining({ ttl: 1800 }));
    });

    it('should handle cache performance improvements', async () => {
      const iterations = 10;
      const times: number[] = [];

      // First iteration (cache miss)
      const start1 = Date.now();
      await userService.findById('1');
      times.push(Date.now() - start1);

      // Subsequent iterations (cache hits)
      for (let i = 1; i < iterations; i++) {
        const start = Date.now();
        await userService.findById('1');
        times.push(Date.now() - start);
      }

      // First call should be significantly slower
      expect(times[0]).toBeGreaterThan(times[1]);
      expect(times[0]).toBeGreaterThan(40); // Should include the 50ms delay

      // Subsequent calls should be much faster
      for (let i = 1; i < iterations; i++) {
        expect(times[i]).toBeLessThan(20); // Should be fast due to cache
      }

      console.log(`Performance test: First call ${times[0]}ms, average cached call ${times.slice(1).reduce((a, b) => a + b, 0) / (iterations - 1)}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle cache failures gracefully', async () => {
      // Simulate cache failure
      cacheManager.get.mockRejectedValue(new Error('Cache read failed'));
      cacheManager.set.mockRejectedValue(new Error('Cache write failed'));

      // Operations should still work
      const user = await userService.findById('1');
      expect(user).toBeDefined();

      const newUser = await userService.create({
        name: 'Test User',
        email: 'test@example.com'
      });
      expect(newUser).toBeDefined();
    });

    it('should handle partial cache invalidation failures', async () => {
      // Cache some data
      await userService.findById('1');
      await userService.findAll();

      // Simulate partial cache invalidation failure
      let deleteCallCount = 0;
      cacheManager.del.mockImplementation(async () => {
        deleteCallCount++;
        if (deleteCallCount <= 1) {
          return true; // First deletion succeeds
        } else {
          throw new Error('Cache deletion failed'); // Subsequent deletions fail
        }
      });

      // Create new user (should attempt cache invalidation)
      const newUser = await userService.create({
        name: 'Test User',
        email: 'test@example.com'
      });

      expect(newUser).toBeDefined();
      expect(deleteCallCount).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    it('should provide accurate cache statistics', async () => {
      // Perform various cache operations
      await userService.findById('1');
      await userService.findByEmail('john@example.com');
      await userService.findAll();
      await productService.findById('p1');

      const stats = await cacheManagementService.getCacheStats();

      expect(stats.totalKeys).toBeGreaterThan(0);
      expect(stats.methodCacheKeys).toBe(stats.totalKeys);
      expect(stats.methodCacheKeys).toBe(4); // 4 cache entries created

      console.log(`Cache stats: ${stats.methodCacheKeys} cache entries`);
    });

    it('should handle cache cleanup operations', async () => {
      // Create cache entries
      await userService.findById('1');
      await userService.findAll();
      await productService.findById('p1');

      // Clear specific service cache
      await cacheManagementService.clearClassCache('TestUserService');

      // Verify user service cache is cleared
      expect(cacheManager.del).toHaveBeenCalledTimes(2); // findById, findAll

      // Product service cache should remain
      const product = await productService.findById('p1');
      expect(product).toBeDefined();
    });
  });
});