import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: jest.Mocked<DataSource>;

  const mockDataSource = {
    isInitialized: true,
    query: jest.fn(),
  };

  beforeEach(async () => {
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
    mockDataSource = module.get(DataSource) as jest.Mocked<DataSource>;

    jest.clearAllMocks();
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
      expect(result.timestamp).toBeValidISOString();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(result.memory.unit).toBe('MB');
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Mock database connection failure
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));
      mockDataSource.isInitialized = true;

      await expect(controller.getHealth()).rejects.toThrow();
    });

    it('should handle uninitialized database', async () => {
      // Mock uninitialized database
      mockDataSource.isInitialized = false;

      await expect(controller.getHealth()).rejects.toThrow();
    });

    it('should include memory usage information', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

      const result = await controller.getHealth();

      expect(result.memory).toBeDefined();
      expect(result.memory.heapUsed).toBeGreaterThanOrEqual(0);
      expect(result.memory.heapTotal).toBeGreaterThanOrEqual(0);
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
      expect(result.services.redis).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.system.nodeVersion).toBe(process.version);
      expect(result.system.pid).toBe(process.pid);
    });

    it('should include database response time', async () => {
      mockDataSource.query.mockResolvedValue(undefined);

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
      expect(result.services.memory.heapUsed).toBeGreaterThanOrEqual(0);
      expect(result.services.memory.heapTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getLiveness', () => {
    it('should return alive status', async () => {
      const result = await controller.getLiveness();

      expect(result).toMatchObject({
        status: 'alive',
      });
      expect(result.timestamp).toBeValidISOString();
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
      expect(result.timestamp).toBeValidISOString();
    });

    it('should return not_ready status when database is disconnected', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      await expect(controller.getReadiness()).rejects.toThrow();
    });

    it('should handle uninitialized database', async () => {
      mockDataSource.isInitialized = false;

      await expect(controller.getReadiness()).rejects.toThrow();
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
        const errorObj = JSON.parse(error.message);
        expect(errorObj.status).toBe('unhealthy');
        expect(errorObj.error).toContain(errorMessage);
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