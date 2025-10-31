import { Cacheable, CacheableOptions, getCacheableMetadata } from '../../../decorators/cacheable.decorator';

describe('Cacheable Decorator', () => {
  describe('Cacheable', () => {
    class TestService {
      @Cacheable()
      public testMethodWithDefaultOptions(): string {
        return 'test-result';
      }

      @Cacheable({ ttl: 1800 })
      public testMethodWithCustomTtl(): string {
        return 'test-result';
      }

      @Cacheable({ disabled: true })
      public testMethodWithDisabledCache(): string {
        return 'test-result';
      }

      @Cacheable({ ttl: 7200, disabled: false })
      public testMethodWithMultipleOptions(): string {
        return 'test-result';
      }
    }

    it('should set default metadata when no options provided', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        TestService.prototype,
        'testMethodWithDefaultOptions'
      );

      const metadata = getCacheableMetadata(TestService.prototype, 'testMethodWithDefaultOptions');

      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(3600); // DEFAULT_CACHE_TTL
      expect(metadata?.disabled).toBe(false);
    });

    it('should set custom TTL when provided', () => {
      const metadata = getCacheableMetadata(TestService.prototype, 'testMethodWithCustomTtl');

      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(1800);
      expect(metadata?.disabled).toBe(false);
    });

    it('should set disabled flag when provided', () => {
      const metadata = getCacheableMetadata(TestService.prototype, 'testMethodWithDisabledCache');

      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(3600); // Should use default TTL
      expect(metadata?.disabled).toBe(true);
    });

    it('should handle multiple options correctly', () => {
      const metadata = getCacheableMetadata(TestService.prototype, 'testMethodWithMultipleOptions');

      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(7200);
      expect(metadata?.disabled).toBe(false);
    });

    it('should return null for methods without Cacheable decorator', () => {
      class AnotherService {
        public plainMethod(): string {
          return 'plain-result';
        }
      }

      const metadata = getCacheableMetadata(AnotherService.prototype, 'plainMethod');
      expect(metadata).toBeNull();
    });
  });

  describe('getCacheableMetadata', () => {
    it('should handle invalid target gracefully', () => {
      const metadata = getCacheableMetadata(null, 'nonExistentMethod');
      expect(metadata).toBeNull();
    });

    it('should handle invalid method name gracefully', () => {
      class TestService {
        @Cacheable()
        public validMethod(): string {
          return 'test';
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype, 'nonExistentMethod' as any);
      expect(metadata).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbol method names', () => {
      const symbolMethod = Symbol('test');

      class TestService {
        @Cacheable({ ttl: 1000 })
        public [symbolMethod](): string {
          return 'symbol-result';
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype, symbolMethod);
      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(1000);
    });

    it('should handle undefined ttl in options', () => {
      class TestService {
        @Cacheable({ ttl: undefined } as any)
        public testMethod(): string {
          return 'test';
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(3600); // Should fall back to default
    });

    it('should handle partial options object', () => {
      class TestService {
        @Cacheable({} as CacheableOptions)
        public testMethod(): string {
          return 'test';
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype, 'testMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.ttl).toBe(3600); // Should use default
      expect(metadata?.disabled).toBe(false); // Should use default
    });
  });
});