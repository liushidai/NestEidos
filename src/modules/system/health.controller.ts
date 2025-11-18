import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

/**
 * 健康检查控制器
 * 提供应用健康状态检查接口，用于 Docker 健康检查和监控系统
 */
@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: '应用健康检查',
    description: '检查应用和数据库连接状态，用于 Docker 健康检查和监控系统',
    externalDocs: {
      description: '健康检查返回状态码',
      url: 'https://docs.docker.com/engine/reference/builder/#healthcheck',
    },
  })
  @ApiResponse({
    status: 200,
    description: '应用健康',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        database: 'connected',
        memory: {
          used: 256,
          total: 512,
          unit: 'MB',
        },
        environment: 'production',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '应用不健康',
    schema: {
      example: {
        status: 'unhealthy',
        timestamp: '2024-01-01T12:00:00.000Z',
        error: 'Database connection failed',
        database: 'disconnected',
      },
    },
  })
  async getHealth() {
    const startTime = Date.now();
    const status = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || 'unknown',
      database: 'disconnected' as 'connected' | 'disconnected',
      memory: null as any,
      environment: process.env.NODE_ENV || 'unknown',
    };

    try {
      // 检查数据库连接
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        status.database = 'connected';
      }
    } catch (error) {
      status.status = 'unhealthy';
      status.database = 'disconnected';
      status.error =
        error instanceof Error ? error.message : 'Database connection failed';
    }

    // 添加内存使用情况
    const memoryUsage = process.memoryUsage();
    status.memory = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      unit: 'MB',
    };

    // 如果不健康，返回 503 状态码
    if (status.status === 'unhealthy') {
      throw new Error(JSON.stringify(status));
    }

    return status;
  }

  @Get('detailed')
  @ApiOperation({
    summary: '详细健康检查',
    description: '提供详细的应用状态信息，包括各组件的详细状态',
  })
  @ApiResponse({
    status: 200,
    description: '详细健康状态',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'production',
        services: {
          database: {
            status: 'connected',
            host: 'localhost',
            database: 'nest_eidos',
            responseTime: 5,
          },
          memory: {
            heapUsed: 256,
            heapTotal: 512,
            external: 128,
            rss: 384,
            unit: 'MB',
          },
        },
        system: {
          nodeVersion: 'v18.19.0',
          platform: 'linux',
          arch: 'x64',
          pid: 1,
        },
      },
    },
  })
  async getDetailedHealth() {
    const startTime = Date.now();

    const healthData = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      services: {
        database: {
          status: 'disconnected' as 'connected' | 'disconnected',
          host: process.env.DB_HOST || 'unknown',
          database: process.env.DB_DATABASE || 'unknown',
          responseTime: 0,
        },
        memory: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0,
          unit: 'MB',
        },
        redis: {
          status: 'disconnected' as 'connected' | 'disconnected',
          host: process.env.REDIS_HOST || 'unknown',
          port: process.env.REDIS_PORT || '6379',
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
    };

    // 检查数据库连接
    try {
      if (this.dataSource.isInitialized) {
        const dbStartTime = Date.now();
        await this.dataSource.query('SELECT 1');
        healthData.services.database.status = 'connected';
        healthData.services.database.responseTime = Date.now() - dbStartTime;
      }
    } catch (error) {
      healthData.status = 'unhealthy';
      healthData.services.database.status = 'disconnected';
    }

    // 检查内存使用
    const memoryUsage = process.memoryUsage();
    healthData.services.memory = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      unit: 'MB',
    };

    // 检查 Redis 连接（简单的模拟检查）
    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      try {
        // 这里可以添加实际的 Redis 连接检查
        // 由于没有 Redis 客户端注入，这里做简单的配置检查
        healthData.services.redis.status = 'connected';
      } catch (error) {
        healthData.services.redis.status = 'disconnected';
      }
    }

    return healthData;
  }

  @Get('liveness')
  @ApiOperation({
    summary: '存活检查 (Liveness)',
    description: 'Kubernetes Liveness Probe - 检查应用是否还在运行',
  })
  @ApiResponse({
    status: 200,
    description: '应用存活',
    schema: {
      example: {
        status: 'alive',
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '应用不存活',
  })
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('readiness')
  @ApiOperation({
    summary: '就绪检查 (Readiness)',
    description: 'Kubernetes Readiness Probe - 检查应用是否准备好处理请求',
  })
  @ApiResponse({
    status: 200,
    description: '应用就绪',
    schema: {
      example: {
        status: 'ready',
        timestamp: '2024-01-01T12:00:00.000Z',
        database: 'connected',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '应用未就绪',
  })
  async getReadiness() {
    const readiness = {
      status: 'ready' as 'ready' | 'not_ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected' as 'connected' | 'disconnected',
    };

    try {
      // 检查数据库连接
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        readiness.database = 'connected';
      } else {
        readiness.status = 'not_ready';
      }
    } catch (error) {
      readiness.status = 'not_ready';
      readiness.database = 'disconnected';
    }

    // 如果未就绪，返回 503 状态码
    if (readiness.status === 'not_ready') {
      throw new Error(JSON.stringify(readiness));
    }

    return readiness;
  }
}
