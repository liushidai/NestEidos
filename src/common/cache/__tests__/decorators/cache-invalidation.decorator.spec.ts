import {
  CacheInvalidation,
  CacheInvalidationConfig,
  getCacheInvalidationConfig,
  CacheInvalidationEntry,
} from '../../../decorators/cache-invalidation.decorator';

describe('CacheInvalidation Decorator', () => {
  describe('CacheInvalidation', () => {
    class TestService {
      @CacheInvalidation({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByEmail', paramMapping: ['result.email'] },
        ],
      })
      public updateMethod(id: string, data: any): any {
        return { id, ...data };
      }

      @CacheInvalidation({
        entries: [{ methodName: 'findAll', clearAll: true }],
      })
      public deleteMethod(id: string): void {
        // Implementation
      }

      @CacheInvalidation({
        entries: [
          { methodName: 'findById', paramMapping: ['args.0'] },
          { methodName: 'findByUserName', paramMapping: ['args.1.userName', 'result.userName'] },
        ],
      })
      public complexUpdateMethod(id: string, data: any): any {
        return { id, ...data };
      }
    }

    it('should set metadata for simple cache invalidation', () => {
      const metadata = getCacheInvalidationConfig(
        TestService.prototype,
        'updateMethod'
      );

      expect(metadata).toBeDefined();
      expect(metadata?.entries).toHaveLength(2);
      expect(metadata?.entries[0]).toEqual({
        methodName: 'findById',
        paramMapping: ['args.0'],
      });
      expect(metadata?.entries[1]).toEqual({
        methodName: 'findByEmail',
        paramMapping: ['result.email'],
      });
    });

    it('should set metadata for clearAll cache invalidation', () => {
      const metadata = getCacheInvalidationConfig(
        TestService.prototype,
        'deleteMethod'
      );

      expect(metadata).toBeDefined();
      expect(metadata?.entries).toHaveLength(1);
      expect(metadata?.entries[0]).toEqual({
        methodName: 'findAll',
        clearAll: true,
      });
    });

    it('should handle complex parameter mapping', () => {
      const metadata = getCacheInvalidationConfig(
        TestService.prototype,
        'complexUpdateMethod'
      );

      expect(metadata).toBeDefined();
      expect(metadata?.entries).toHaveLength(2);
      expect(metadata?.entries[0]).toEqual({
        methodName: 'findById',
        paramMapping: ['args.0'],
      });
      expect(metadata?.entries[1]).toEqual({
        methodName: 'findByUserName',
        paramMapping: ['args.1.userName', 'result.userName'],
      });
    });

    it('should return null for methods without CacheInvalidation decorator', () => {
      class AnotherService {
        public plainMethod(): void {
          // No decorator
        }
      }

      const metadata = getCacheInvalidationConfig(AnotherService.prototype, 'plainMethod');
      expect(metadata).toBeNull();
    });
  });

  describe('getCacheInvalidationConfig', () => {
    it('should handle invalid target gracefully', () => {
      const metadata = getCacheInvalidationConfig(null, 'nonExistentMethod');
      expect(metadata).toBeNull();
    });

    it('should handle invalid method name gracefully', () => {
      class TestService {
        @CacheInvalidation({
          entries: [{ methodName: 'test', clearAll: true }],
        })
        public validMethod(): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, 'nonExistentMethod' as any);
      expect(metadata).toBeNull();
    });

    it('should handle symbol method names', () => {
      const symbolMethod = Symbol('test');

      class TestService {
        @CacheInvalidation({
          entries: [{ methodName: 'symbolTest', clearAll: true }],
        })
        public [symbolMethod](): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, symbolMethod);
      expect(metadata).toBeDefined();
      expect(metadata?.entries).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty entries array', () => {
      class TestService {
        @CacheInvalidation({ entries: [] })
        public testMethod(): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.entries).toHaveLength(0);
    });

    it('should handle entries with only methodName', () => {
      class TestService {
        @CacheInvalidation({
          entries: [{ methodName: 'test' } as CacheInvalidationEntry],
        })
        public testMethod(): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.entries[0]).toEqual({
        methodName: 'test',
      });
    });

    it('should handle entries with empty paramMapping', () => {
      class TestService {
        @CacheInvalidation({
          entries: [{ methodName: 'test', paramMapping: [] }],
        })
        public testMethod(): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.entries[0]).toEqual({
        methodName: 'test',
        paramMapping: [],
      });
    });

    it('should handle partial configuration', () => {
      class TestService {
        @CacheInvalidation({} as CacheInvalidationConfig)
        public testMethod(): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.entries).toBeUndefined();
    });

    it('should handle multiple paramMapping values', () => {
      class TestService {
        @CacheInvalidation({
          entries: [{
            methodName: 'test',
            paramMapping: ['args.0', 'args.1.id', 'result.name', 'fixed-value']
          }],
        })
        public testMethod(): void {}
      }

      const metadata = getCacheInvalidationConfig(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.entries[0].paramMapping).toEqual([
        'args.0', 'args.1.id', 'result.name', 'fixed-value'
      ]);
    });
  });
});