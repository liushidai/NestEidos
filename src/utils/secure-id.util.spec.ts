import { SecureIdUtil } from './secure-id.util';
import { ConfigService } from '@nestjs/config';

describe('SecureIdUtil (Feistel PRP)', () => {
  let secureIdUtil: SecureIdUtil;
  let mockConfigService: jest.Mocked<ConfigService>;

  // 有效的 32 字节密钥（hex格式）
  const validHexKey =
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const validBase64Key = Buffer.from(validHexKey, 'hex').toString('base64');

  beforeEach(() => {
    // 重置单例实例
    (SecureIdUtil as any).instance = null;

    // 创建 mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    // 设置新的密钥配置项
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'SECURE_ID_SECRET_KEY') {
        return `hex:${validHexKey}`;
      }
      return undefined;
    });

    secureIdUtil = SecureIdUtil.getInstance(mockConfigService);
  });

  describe('基础功能测试', () => {
    it('应该返回单例实例', () => {
      const instance1 = SecureIdUtil.getInstance(mockConfigService);
      const instance2 = SecureIdUtil.getInstance(mockConfigService);
      expect(instance1).toBe(instance2);
    });

    it('应该成功编码雪花ID', () => {
      const snowflakeId = 1234567890123456789n;
      const encoded = secureIdUtil.encode(snowflakeId);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded.length).toBeLessThan(12); // Base62 编码 64 位最多 11 字符
    });

    it('应该成功解码为原始ID', () => {
      const snowflakeId = 1234567890123456789n;
      const encoded = secureIdUtil.encode(snowflakeId);
      const decoded = secureIdUtil.decode(encoded);

      expect(decoded).toBe(snowflakeId);
    });

    it('编码后再解码的结果应该与原始ID一致', () => {
      const testIds = [
        0n,
        1n,
        1234567890123456789n,
        9223372036854775807n, // Number.MAX_SAFE_INTEGER
        18446744073709551615n, // 2^64 - 1
        BigInt('9999999999999999999999'), // 超出64位，但能处理（会截取低64位）
      ];

      testIds.forEach((id) => {
        expect(secureIdUtil.validateEncodeDecodeRoundtrip(id)).toBe(true);
      });
    });
  });

  describe('Feistel PRP 安全性测试', () => {
    it('相同的ID编码结果应该保持一致', () => {
      const snowflakeId = 1234567890123456789n;
      const encoded1 = secureIdUtil.encode(snowflakeId);
      const encoded2 = secureIdUtil.encode(snowflakeId);

      expect(encoded1).toBe(encoded2);
    });

    it('不同的ID应该产生不同的编码结果', () => {
      const id1 = 1234567890123456789n;
      const id2 = 9876543210987654321n;
      const encoded1 = secureIdUtil.encode(id1);
      const encoded2 = secureIdUtil.encode(id2);

      expect(encoded1).not.toBe(encoded2);
    });

    it('连续ID的编码应该呈现非线性特征', () => {
      const ids = Array.from({ length: 100 }, (_, i) => BigInt(i + 1));
      const encodedIds = secureIdUtil.encodeBatch(ids);

      // 检查编码结果不呈现单调递增特性
      let monotonicCount = 0;
      for (let i = 1; i < encodedIds.length; i++) {
        if (encodedIds[i] > encodedIds[i - 1]) {
          monotonicCount++;
        }
      }

      // 非线性特性：单调递增的比例应该远低于100%
      expect(monotonicCount).toBeLessThan(encodedIds.length * 0.7);
    });

    it('不同密钥对同一ID应该产生不同编码', () => {
      const testId = 1234567890123456789n;
      const encoded1 = secureIdUtil.encode(testId);

      // 创建不同密钥的实例
      (SecureIdUtil as any).instance = null;
      const differentKey =
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      const differentConfigService = {
        get: jest.fn().mockReturnValue(`hex:${differentKey}`),
      } as unknown as jest.Mocked<ConfigService>;

      const differentUtil = SecureIdUtil.getInstance(differentConfigService);
      const encoded2 = differentUtil.encode(testId);

      expect(encoded1).not.toBe(encoded2);
    });

    it('Feistel轮数应该是12轮', () => {
      expect(secureIdUtil.getRounds()).toBe(12);
    });
  });

  describe('Base62 编码测试', () => {
    it('应该正确处理零值', () => {
      const encoded = secureIdUtil.encode(0n);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      expect(secureIdUtil.isValidBase62(encoded)).toBe(true);

      // 验证可以正确解码
      const decoded = secureIdUtil.decode(encoded);
      expect(decoded).toBe(0n);
    });

    it('应该正确处理最大64位无符号整数', () => {
      const maxValue = 18446744073709551615n; // 2^64 - 1
      const encoded = secureIdUtil.encode(maxValue);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('编码结果应该只包含Base62字符集', () => {
      const testId = 1234567890123456789n;
      const encoded = secureIdUtil.encode(testId);

      expect(secureIdUtil.isValidBase62(encoded)).toBe(true);
    });
  });

  describe('输入校验测试', () => {
    it('编码负数ID应该抛出异常', () => {
      expect(() => {
        secureIdUtil.encode(-1n);
      }).toThrow('Invalid snowflake ID');
    });

    it('编码非bigint类型应该抛出异常', () => {
      expect(() => {
        secureIdUtil.encode(123 as any);
      }).toThrow('Invalid snowflake ID');
    });

    it('解码空字符串应该抛出异常', () => {
      expect(() => {
        secureIdUtil.decode('');
      }).toThrow('Invalid encoded ID: must be a non-empty string');
    });

    it('解码超长字符串应该抛出异常', () => {
      const longString = 'a'.repeat(12); // 超过11字符
      expect(() => {
        secureIdUtil.decode(longString);
      }).toThrow(
        'Invalid encoded ID: length must be between 1 and 11 characters',
      );
    });

    it('解码null应该抛出异常', () => {
      expect(() => {
        secureIdUtil.decode(null as any);
      }).toThrow('Invalid encoded ID: must be a non-empty string');
    });

    it('解码undefined应该抛出异常', () => {
      expect(() => {
        secureIdUtil.decode(undefined as any);
      }).toThrow('Invalid encoded ID: must be a non-empty string');
    });

    it('解码无效Base62字符应该抛出异常', () => {
      expect(() => {
        secureIdUtil.decode('abc@#$%');
      }).toThrow('Invalid encoded ID: contains invalid Base62 characters');
    });

    it('解码包含空格的字符串应该抛出异常', () => {
      expect(() => {
        secureIdUtil.decode('abc def');
      }).toThrow('Invalid encoded ID: contains invalid Base62 characters');
    });

    it('解码损坏的数据应该抛出异常', () => {
      // 编码一个有效的ID，然后手动破坏数据
      const validEncoded = secureIdUtil.encode(1234567890123456789n);
      // 添加一个无效字符使其肯定无法解码
      const corrupted = validEncoded + '@';

      expect(() => {
        secureIdUtil.decode(corrupted);
      }).toThrow('Invalid encoded ID: contains invalid Base62 characters');
    });

    it('isValidBase62应该正确验证字符集', () => {
      expect(secureIdUtil.isValidBase62('ABCdef123')).toBe(true);
      expect(secureIdUtil.isValidBase62('abc@#$')).toBe(false);
      expect(secureIdUtil.isValidBase62('abc def')).toBe(false);
      expect(secureIdUtil.isValidBase62('')).toBe(false);
      expect(secureIdUtil.isValidBase62('中文')).toBe(false);
    });
  });

  describe('密钥管理测试', () => {
    it('应该验证HMAC密钥有效性', () => {
      expect(secureIdUtil.isKeyValid()).toBe(true);
      expect(secureIdUtil.getKeyLength()).toBe(32);
    });

    it('支持SECURE_ID_SECRET_KEY配置项', () => {
      // 重置单例以创建新实例
      (SecureIdUtil as any).instance = null;

      const testConfigService = {
        get: jest.fn(),
      } as unknown as jest.Mocked<ConfigService>;

      testConfigService.get.mockReturnValue(`hex:${validHexKey}`);
      const util = SecureIdUtil.getInstance(testConfigService);
      expect(util.isKeyValid()).toBe(true);
    });

    it('支持base64格式密钥', () => {
      // 重置单例以创建新实例
      (SecureIdUtil as any).instance = null;

      const testConfigService = {
        get: jest.fn(),
      } as unknown as jest.Mocked<ConfigService>;

      testConfigService.get.mockReturnValue(`base64:${validBase64Key}`);
      const util = SecureIdUtil.getInstance(testConfigService);
      expect(util.isKeyValid()).toBe(true);
    });

    it('应该自动规范化非32字节密钥', () => {
      // 重置单例以创建新实例
      (SecureIdUtil as any).instance = null;

      const testConfigService = {
        get: jest.fn(),
      } as unknown as jest.Mocked<ConfigService>;

      const shortKey = '1234567890abcdef'; // 16字节
      testConfigService.get.mockReturnValue(`hex:${shortKey}`);
      const util = SecureIdUtil.getInstance(testConfigService);
      expect(util.isKeyValid()).toBe(true);
      expect(util.getKeyLength()).toBe(32);
    });

    it('缺少密钥配置应该抛出异常', () => {
      // 重置单例以创建新实例
      (SecureIdUtil as any).instance = null;

      const testConfigService = {
        get: jest.fn(),
      } as unknown as jest.Mocked<ConfigService>;

      testConfigService.get.mockReturnValue(undefined);
      expect(() => {
        SecureIdUtil.getInstance(testConfigService);
      }).toThrow('SECURE_ID_SECRET_KEY environment variable is required');
    });
  });

  describe('批量操作测试', () => {
    it('应该正确批量编码', () => {
      const ids = [1n, 2n, 3n, 1234567890123456789n];
      const encoded = secureIdUtil.encodeBatch(ids);

      expect(encoded).toHaveLength(4);
      encoded.forEach((str, index) => {
        expect(typeof str).toBe('string');
        expect(secureIdUtil.decode(str)).toBe(ids[index]);
      });
    });

    it('应该正确批量解码', () => {
      const ids = [1n, 2n, 3n, 1234567890123456789n];
      const encoded = secureIdUtil.encodeBatch(ids);
      const decoded = secureIdUtil.decodeBatch(encoded);

      expect(decoded).toEqual(ids);
    });

    it('批量编码应该处理空数组', () => {
      const encoded = secureIdUtil.encodeBatch([]);
      expect(encoded).toEqual([]);
    });

    it('批量解码应该处理空数组', () => {
      const decoded = secureIdUtil.decodeBatch([]);
      expect(decoded).toEqual([]);
    });
  });

  describe('边界值测试', () => {
    it('应该处理最小64位值', () => {
      const minId = 0n;
      const encoded = secureIdUtil.encode(minId);
      const decoded = secureIdUtil.decode(encoded);
      expect(decoded).toBe(minId);
    });

    it('应该处理最大64位值', () => {
      const maxId = 18446744073709551615n; // 2^64 - 1
      const encoded = secureIdUtil.encode(maxId);
      const decoded = secureIdUtil.decode(encoded);
      expect(decoded).toBe(maxId);
    });

    it('应该正确处理64位边界值', () => {
      const borderId = BigInt('2') ** BigInt('64') - 1n; // 2^64 - 1
      const encoded = secureIdUtil.encode(borderId);
      const decoded = secureIdUtil.decode(encoded);
      expect(decoded).toBe(borderId);
      expect(typeof encoded).toBe('string');
    });
  });

  describe('Feistel 网络特性测试', () => {
    it('应该具有雪崩效应（小比特变化导致大变化）', () => {
      // 选择两个相邻的ID
      const id1 = 1234567890123456789n;
      const id2 = id1 + 1n;

      const encoded1 = secureIdUtil.encode(id1);
      const encoded2 = secureIdUtil.encode(id2);

      // 计算汉明距离（字符级的差异）
      let distance = 0;
      const len = Math.max(encoded1.length, encoded2.length);

      for (let i = 0; i < len; i++) {
        if (encoded1[i] !== encoded2[i]) {
          distance++;
        }
      }

      // 由于 Feistel 的扩散特性，单个比特变化应该导致多个字符变化
      expect(distance).toBeGreaterThan(1);
    });

    it('应该具有完美的可逆性', () => {
      const testIds = [
        0n,
        1n,
        BigInt('2') ** BigInt('63') - 1n, // 最大63位值
        1234567890123456789n,
        BigInt('123456789012345678901234567890'), // 超出64位
      ];

      testIds.forEach((id) => {
        const encoded = secureIdUtil.encode(id);
        const decoded = secureIdUtil.decode(encoded);

        // 验证可逆性：对于超出64位的ID，应该只验证低64位一致
        const expectedId = id & ((1n << 64n) - 1n);
        expect(decoded).toBe(expectedId);
      });
    });

    it('应该有良好的输出分布', () => {
      const sampleSize = 1000;
      const ids = Array.from({ length: sampleSize }, (_, i) => BigInt(i + 1));
      const encodedIds = ids.map((id) => secureIdUtil.encode(id));

      // 计算第一个字符的分布
      const charCount = new Map<string, number>();
      encodedIds.forEach((id) => {
        const firstChar = id[0] || '';
        charCount.set(firstChar, (charCount.get(firstChar) || 0) + 1);
      });

      // 应该使用较多的字符，分布相对均匀
      expect(charCount.size).toBeGreaterThan(30);
      console.log(`首字符分布: ${charCount.size} 种不同字符`);
    });
  });

  describe('性能测试', () => {
    it('编码性能测试', () => {
      const start = performance.now();
      const count = 10000;
      const testId = 1234567890123456789n;

      for (let i = 0; i < count; i++) {
        secureIdUtil.encode(testId);
      }

      const end = performance.now();
      const duration = end - start;
      const rate = count / (duration / 1000);

      expect(rate).toBeGreaterThan(5000); // Feistel 更复杂，期望较低的性能
      console.log(
        `编码 ${count} 个ID 耗时: ${duration.toFixed(2)}ms, 速率: ${rate.toFixed(0)} ID/s`,
      );
    });

    it('解码性能测试', () => {
      const testId = 1234567890123456789n;
      const encoded = secureIdUtil.encode(testId);

      const start = performance.now();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        secureIdUtil.decode(encoded);
      }

      const end = performance.now();
      const duration = end - start;
      const rate = count / (duration / 1000);

      expect(rate).toBeGreaterThan(5000); // Feistel 更复杂，期望较低的性能
      console.log(
        `解码 ${count} 个ID 耗时: ${duration.toFixed(2)}ms, 速率: ${rate.toFixed(0)} ID/s`,
      );
    });

    it('往返转换性能测试', () => {
      const start = performance.now();
      const count = 2000; // Feistel 较慢，减少测试数量
      const testIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

      for (const id of testIds) {
        secureIdUtil.validateEncodeDecodeRoundtrip(id);
      }

      const end = performance.now();
      const duration = end - start;
      const rate = count / (duration / 1000);

      expect(rate).toBeGreaterThan(2000); // 期望适中的往返性能
      console.log(
        `往返转换 ${count} 个ID 耗时: ${duration.toFixed(2)}ms, 速率: ${rate.toFixed(0)} ID/s`,
      );
    });
  });

  describe('实际使用场景模拟', () => {
    it('应该能处理真实的雪花ID格式', () => {
      // 模拟真实的雪花ID（通常以当前时间戳为基础）
      const realSnowflakeIds = [
        1704067200000000000n, // 2024-01-01 00:00:00 的示例
        1704153600000000001n, // 次日
        1704240000000000002n, // 第三天
        9223372036854775807n, // JavaScript 最大安全整数
        1234567890123456789n, // 示例ID
      ];

      realSnowflakeIds.forEach((id) => {
        const encoded = secureIdUtil.encode(id);
        const decoded = secureIdUtil.decode(encoded);
        expect(decoded).toBe(id);
        expect(secureIdUtil.isValidBase62(encoded)).toBe(true);
      });
    });

    it('应该生成足够短的URL路径', () => {
      const testId = 1234567890123456789n;
      const encoded = secureIdUtil.encode(testId);

      // Base62 编码 64 位最多11个字符
      expect(encoded.length).toBeLessThanOrEqual(11);

      // URL 应该简短易读
      expect(encoded.length).toBeGreaterThan(3);
    });

    it('应该防止通过编码推测原始ID', () => {
      const sequentialIds = [1n, 2n, 3n, 4n, 5n];
      const encodedIds = sequentialIds.map((id) => secureIdUtil.encode(id));

      // 检查编码结果不显示递增规律
      for (let i = 1; i < encodedIds.length; i++) {
        expect(encodedIds[i]).not.toBe(encodedIds[i - 1] + '1');
        expect(encodedIds[i]).not.toBe(String(Number(encodedIds[i - 1]) + 1));
      }
    });
  });
});
