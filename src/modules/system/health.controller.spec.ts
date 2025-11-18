import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

// 定义 Mock DataSource 类型
interface MockDataSource {
  isInitialized: boolean;
  query: jest.Mock;
  options: any;
  driver: any;
  manager: any;
  name: string;
}

// 创建一个更简单的 mock 对象
const createMockDataSource = (isInitialized: boolean = true): MockDataSource => ({
  isInitialized,
  query: jest.fn(),
  // 添加其他必要的属性
  options: {} as any,
  driver: {} as any,
  manager: {} as any,
  // 添加其他只读属性的默认值
  name: 'default',
});

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: MockDataSource;

  beforeEach(async () => {
    mockDataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return healthy status when database is connected', async () => {
      // Mock database connection success
      mockDataSource.query.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result).toMatchObject({
        status: 'healthy',
        database: 'connected',
        environment: 'test',
        version: expect.any(String),
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Mock database connection failure
      mockDataSource.query!.mockRejectedValue(new Error('Connection failed'));

      await expect(controller.getHealth()).rejects.toThrow();
    });

    it('should handle uninitialized database', async () => {
      // Create a new mock with uninitialized database
      const uninitializedDataSource = createMockDataSource(false);

      // Create a new module instance with uninitialized database
      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule],
        controllers: [HealthController],
        providers: [
          {
            provide: DataSource,
            useValue: uninitializedDataSource,
          },
        ],
      }).compile();

      const uninitializedController = module.get<HealthController>(HealthController);

      const result = await uninitializedController.getHealth();

      // When database is not initialized, it should still return healthy status
      // but with disconnected database status
      expect(result.status).toBe('healthy');
      expect(result.database).toBe('disconnected');
    });

    it('should include memory usage information', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result.memory).toBeDefined();
      expect(result.memory.unit).toBe('MB');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health information', async () => {
      // Mock database connection success
      mockDataSource.query.mockResolvedValue(undefined);

      const result = await controller.getDetailedHealth();

      expect(result).toMatchObject({
        status: 'healthy',
        environment: 'test',
        version: expect.any(String),
      });
      expect(result.services).toBeDefined();
      expect(result.services.database).toBeDefined();
      expect(result.services.memory).toBeDefined();
    });

    it('should include database response time', async () => {
      // Mock query with a small delay to simulate response time
      mockDataSource.query.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay
        return undefined;
      });

      const result = await controller.getDetailedHealth();

      expect(result.services.database.status).toBe('connected');
      expect(result.services.database.responseTime).toBeGreaterThan(0);
    });

    it('should return unhealthy when database fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      const result = await controller.getDetailedHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('disconnected');
    });

    it('should include memory details', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

      const result = await controller.getDetailedHealth();

      expect(result.services.memory).toMatchObject({
        unit: 'MB',
      });
    });
  });

  describe('getLiveness', () => {
    it('should return alive status', async () => {
      const result = await controller.getLiveness();

      expect(result).toMatchObject({
        status: 'alive',
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when database is connected', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

      const result = await controller.getReadiness();

      expect(result).toMatchObject({
        status: 'ready',
        database: 'connected',
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return not_ready status when database is disconnected', async () => {
      mockDataSource.query!.mockRejectedValue(new Error('Connection failed'));

      await expect(controller.getReadiness()).rejects.toThrow();
    });

    it('should handle uninitialized database', async () => {
      // Create a new mock with uninitialized database
      const uninitializedDataSource = createMockDataSource(false);

      // Create a new module instance with uninitialized database
      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule],
        controllers: [HealthController],
        providers: [
          {
            provide: DataSource,
            useValue: uninitializedDataSource,
          },
        ],
      }).compile();

      const uninitializedController = module.get<HealthController>(HealthController);

      await expect(uninitializedController.getReadiness()).rejects.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle database query errors gracefully', async () => {
      mockDataSource.query.mockImplementation(() => {
        throw new Error('Query execution failed');
      });

      await expect(controller.getHealth()).rejects.toThrow();
    });

    it('should provide meaningful error information', async () => {
      const errorMessage = 'Database connection timeout';
      mockDataSource.query.mockRejectedValue(new Error(errorMessage));

      try {
        await controller.getHealth();
      } catch (error) {
        expect(error.message).toContain(errorMessage);
      }
    });
  });

  describe('Performance', () => {
    it('should respond quickly', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

      const startTime = Date.now();
      await controller.getHealth();
      const responseTime = Date.now() - startTime;

      // Health check should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle detailed health check within reasonable time', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

      const startTime = Date.now();
      await controller.getDetailedHealth();
      const responseTime = Date.now() - startTime;

      // Detailed health check should respond within 200ms
      expect(responseTime).toBeLessThan(200);
    });
  });
});