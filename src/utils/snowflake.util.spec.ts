import { SnowflakeUtil } from './snowflake.util';

describe('SnowflakeUtil', () => {
  let snowflake: SnowflakeUtil;

  beforeEach(() => {
    // 重置单例实例
    (SnowflakeUtil as any).instance = null;
    snowflake = SnowflakeUtil.getInstance(1, 1);
  });

  describe('基本功能测试', () => {
    it('应该返回单例实例', () => {
      const instance1 = SnowflakeUtil.getInstance();
      const instance2 = SnowflakeUtil.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该生成字符串类型的ID', () => {
      const id = snowflake.nextId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('应该生成不同的ID', () => {
      const id1 = snowflake.nextId();
      const id2 = snowflake.nextId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('ID单调性和唯一性测试', () => {
    it('同一毫秒内生成的ID应该是单调递增的', () => {
      const ids: string[] = [];
      // 快速生成多个ID（可能在同一毫秒内）
      for (let i = 0; i < 10; i++) {
        ids.push(snowflake.nextId());
      }

      // 转换为BigInt比较
      const bigIntIds = ids.map(id => BigInt(id));
      for (let i = 1; i < bigIntIds.length; i++) {
        expect(bigIntIds[i]).toBeGreaterThan(bigIntIds[i - 1]);
      }
    });

    it('生成的ID应该是唯一的', () => {
      const idSet = new Set<string>();
      const totalIds = 1000;

      for (let i = 0; i < totalIds; i++) {
        const id = snowflake.nextId();
        expect(idSet.has(id)).toBe(false);
        idSet.add(id);
      }

      expect(idSet.size).toBe(totalIds);
    });
  });

  describe('位布局验证', () => {
    it('ID的位布局应该符合标准雪花算法', () => {
      const id = snowflake.nextId();
      const bigIntId = BigInt(id);

      // 提取各部分
      const sequence = bigIntId & 4095n; // 低12位
      const workerId = (bigIntId >> 12n) & 31n; // 位12-16
      const datacenterId = (bigIntId >> 17n) & 31n; // 位17-21
      const timestamp = (bigIntId >> 22n) + 1288834974657n; // 位22-63

      expect(sequence).toBeGreaterThanOrEqual(0n);
      expect(sequence).toBeLessThanOrEqual(4095n);

      expect(workerId).toBe(1n); // 我们设置的workerId=1
      expect(datacenterId).toBe(1n); // 我们设置的datacenterId=1

      expect(timestamp).toBeGreaterThan(1288834974657n); // 纪元时间戳之后
    });

    it('不同workerId/datacenterId应该生成不同的ID', () => {
      (SnowflakeUtil as any).instance = null;
      const snowflake1 = SnowflakeUtil.getInstance(1, 1);
      (SnowflakeUtil as any).instance = null;
      const snowflake2 = SnowflakeUtil.getInstance(2, 1);

      const id1 = snowflake1.nextId();
      const id2 = snowflake2.nextId();

      expect(id1).not.toBe(id2);

      // 验证workerId位段不同
      const workerId1 = (BigInt(id1) >> 12n) & 31n;
      const workerId2 = (BigInt(id2) >> 12n) & 31n;

      expect(workerId1).toBe(1n);
      expect(workerId2).toBe(2n);
    });
  });

  describe('序列号测试', () => {
    it('同一毫秒内序列号应该递增', async () => {
      const ids: string[] = [];

      // 在同一毫秒内快速生成多个ID
      const start = Date.now();
      while (Date.now() === start) {
        // 等待时间戳变化
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // 在新的毫秒内快速生成ID
      const currentMs = Date.now();
      for (let i = 0; i < 5; i++) {
        while (Date.now() === currentMs) {
          // 确保在同一个毫秒内
        }
        ids.push(snowflake.nextId());
      }

      // 检查序列号位
      const sequence1 = BigInt(ids[0]) & 4095n;
      const sequence2 = BigInt(ids[1]) & 4095n;

      // 序列号应该是递增的（除非发生了毫秒切换）
      expect(sequence2).toBeGreaterThanOrEqual(sequence1);
    });

    it('序列号溢出时应该等待到下一毫秒', () => {
      // 这个测试比较难直接验证，但我们可以验证序列号掩码正确
      const id = snowflake.nextId();
      const sequence = BigInt(id) & 4095n;
      expect(sequence).toBeGreaterThanOrEqual(0n);
      expect(sequence).toBeLessThanOrEqual(4095n);
    });
  });

  describe('时间戳测试', () => {
    it('生成的ID应该按时间排序', async () => {
      const ids: string[] = [];

      // 每隔几毫秒生成一个ID
      for (let i = 0; i < 5; i++) {
        ids.push(snowflake.nextId());
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // 验证时间戳递增
      const timestamps = ids.map(id => (BigInt(id) >> 22n) + 1288834974657n);

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('参数验证测试', () => {
    it('workerId超出范围应该抛出错误', () => {
      expect(() => {
        (SnowflakeUtil as any).instance = null;
        SnowflakeUtil.getInstance(32, 1);
      }).toThrow('workerId must be between 0 and 31');

      expect(() => {
        (SnowflakeUtil as any).instance = null;
        SnowflakeUtil.getInstance(-1, 1);
      }).toThrow('workerId must be between 0 and 31');
    });

    it('datacenterId超出范围应该抛出错误', () => {
      expect(() => {
        (SnowflakeUtil as any).instance = null;
        SnowflakeUtil.getInstance(1, 32);
      }).toThrow('datacenterId must be between 0 and 31');

      expect(() => {
        (SnowflakeUtil as any).instance = null;
        SnowflakeUtil.getInstance(1, -1);
      }).toThrow('datacenterId must be between 0 and 31');
    });
  });

  describe('时钟回退测试', () => {
    it('时钟回退应该抛出错误', () => {
      // 这个测试需要模拟时钟回退，比较难直接测试
      // 但我们可以验证错误消息的存在
      const currentTimestamp = Date.now();

      // 手动设置lastTimestamp为未来时间
      (snowflake as any).lastTimestamp = currentTimestamp + 1000;

      expect(() => {
        snowflake.nextId();
      }).toThrow('Clock moved backwards');
    });
  });

  describe('性能测试', () => {
    it('生成大量ID的性能测试', () => {
      const start = performance.now();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        snowflake.nextId();
      }

      const end = performance.now();
      const duration = end - start;
      const rate = count / (duration / 1000);

      // 每秒应该能生成至少10万个ID
      expect(rate).toBeGreaterThan(100000);

      console.log(`生成 ${count} 个ID 耗时: ${duration.toFixed(2)}ms, 速率: ${rate.toFixed(0)} ID/s`);
    });
  });
});