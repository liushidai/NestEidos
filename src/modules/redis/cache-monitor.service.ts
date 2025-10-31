import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { TTLUtils } from '../../common/ttl/tls.config';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  missRate: number;
  totalOperations: number;
  averageResponseTime: number;
  lastResetTime: Date;
}

export interface CacheHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: CacheMetrics;
  latency: {
    get: number;
    set: number;
    delete: number;
  };
  memory: {
    used: number;
    max: number;
    usagePercentage: number;
  };
  recommendations: string[];
}

@Injectable()
export class CacheMonitorService {
  private readonly logger = new Logger(CacheMonitorService.name);
  private readonly operationMetrics = new Map<string, number>();
  private readonly responseTimeMetrics = new Map<string, number[]>();
  private lastResetTime = new Date();

  constructor(@Inject('CACHE_INSTANCE') private readonly cache: Cacheable) {
    // 定期清理旧的响应时间数据，防止内存泄漏
    setInterval(() => {
      this.cleanupResponseTimeMetrics();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 记录缓存操作指标
   */
  recordOperation(operation: 'get' | 'set' | 'delete' | 'error', responseTime?: number): void {
    // 更新操作计数
    const currentCount = this.operationMetrics.get(operation) || 0;
    this.operationMetrics.set(operation, currentCount + 1);

    // 记录响应时间
    if (responseTime !== undefined) {
      const times = this.responseTimeMetrics.get(operation) || [];
      times.push(responseTime);

      // 只保留最近的100个响应时间记录
      if (times.length > 100) {
        times.shift();
      }

      this.responseTimeMetrics.set(operation, times);
    }
  }

  /**
   * 获取当前缓存指标
   */
  getMetrics(): CacheMetrics {
    const hits = this.operationMetrics.get('get_hits') || 0;
    const misses = this.operationMetrics.get('get_misses') || 0;
    const sets = this.operationMetrics.get('set') || 0;
    const deletes = this.operationMetrics.get('delete') || 0;
    const errors = this.operationMetrics.get('error') || 0;
    const totalOperations = hits + misses + sets + deletes;

    return {
      hits,
      misses,
      sets,
      deletes,
      errors,
      hitRate: totalOperations > 0 ? (hits / (hits + misses)) * 100 : 0,
      missRate: totalOperations > 0 ? (misses / (hits + misses)) * 100 : 0,
      totalOperations,
      averageResponseTime: this.calculateAverageResponseTime(),
      lastResetTime: this.lastResetTime,
    };
  }

  /**
   * 获取缓存健康状态
   */
  async getHealthStatus(): Promise<CacheHealthStatus> {
    const metrics = this.getMetrics();
    const latency = await this.measureLatency();
    const memory = await this.getMemoryUsage();
    const recommendations = this.generateRecommendations(metrics, latency, memory);

    // 确定健康状态
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.hitRate < 50 || metrics.errors > metrics.totalOperations * 0.05) {
      status = 'unhealthy';
    } else if (metrics.hitRate < 70 || latency.get > 100 || memory.usagePercentage > 90) {
      status = 'degraded';
    }

    return {
      status,
      metrics,
      latency,
      memory,
      recommendations,
    };
  }

  /**
   * 测量缓存操作延迟
   */
  private async measureLatency(): Promise<{ get: number; set: number; delete: number }> {
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'health_check_value';

    try {
      // 测试get延迟
      const getStart = Date.now();
      await this.cache.get(testKey);
      const getLatency = Date.now() - getStart;

      // 测试set延迟
      const setStart = Date.now();
      await this.cache.set(testKey, testValue, 1000); // 1秒TTL
      const setLatency = Date.now() - setStart;

      // 测试delete延迟
      const deleteStart = Date.now();
      await this.cache.delete(testKey);
      const deleteLatency = Date.now() - deleteStart;

      return { get: getLatency, set: setLatency, delete: deleteLatency };
    } catch (error) {
      this.logger.error('测量缓存延迟失败', error.stack);
      return { get: -1, set: -1, delete: -1 };
    }
  }

  /**
   * 获取内存使用情况
   */
  private async getMemoryUsage(): Promise<{ used: number; max: number; usagePercentage: number }> {
    // 这里需要根据实际的Redis配置获取内存信息
    // 由于cacheable库的限制，这里返回模拟数据
    // 在实际应用中，可以直接连接Redis获取INFO memory信息

    return {
      used: 0, // 实际应用中应该从Redis获取
      max: 0,  // 实际应用中应该从Redis获取
      usagePercentage: 0, // 实际应用中应该计算
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    metrics: CacheMetrics,
    latency: { get: number; set: number; delete: number },
    memory: { usagePercentage: number }
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.hitRate < 50) {
      recommendations.push('缓存命中率过低，考虑调整缓存策略或增加缓存时间');
    }

    if (latency.get > 100) {
      recommendations.push('获取操作延迟过高，检查Redis连接配置或考虑使用连接池');
    }

    if (latency.set > 200) {
      recommendations.push('设置操作延迟过高，可能存在网络问题或Redis负载过高');
    }

    if (memory.usagePercentage > 80) {
      recommendations.push('内存使用率过高，考虑清理过期键或增加Redis内存');
    }

    if (metrics.errors > metrics.totalOperations * 0.01) {
      recommendations.push('错误率过高，检查Redis连接状态和网络连通性');
    }

    if (recommendations.length === 0) {
      recommendations.push('缓存运行状态良好，无需调整');
    }

    return recommendations;
  }

  /**
   * 计算平均响应时间
   */
  private calculateAverageResponseTime(): number {
    const allTimes: number[] = [];

    for (const times of this.responseTimeMetrics.values()) {
      allTimes.push(...times);
    }

    if (allTimes.length === 0) {
      return 0;
    }

    const sum = allTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / allTimes.length);
  }

  /**
   * 清理旧的响应时间指标，防止内存泄漏
   */
  private cleanupResponseTimeMetrics(): void {
    for (const [operation, times] of this.responseTimeMetrics.entries()) {
      if (times.length > 50) {
        // 只保留最近的50个记录
        this.responseTimeMetrics.set(operation, times.slice(-50));
      }
    }
  }

  /**
   * 重置所有指标
   */
  resetMetrics(): void {
    this.operationMetrics.clear();
    this.responseTimeMetrics.clear();
    this.lastResetTime = new Date();
    this.logger.log('缓存监控指标已重置');
  }

  /**
   * 获取详细的统计报告
   */
  async getDetailedReport(): Promise<any> {
    const metrics = this.getMetrics();
    const healthStatus = await this.getHealthStatus();
    const cacheableStats = this.cache.stats;

    return {
      timestamp: new Date(),
      metrics,
      healthStatus,
      cacheableStats: cacheableStats || {},
      systemInfo: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
    };
  }

  /**
   * 导出指标为Prometheus格式
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();

    return [
      `# HELP cache_operations_total Total number of cache operations`,
      `# TYPE cache_operations_total counter`,
      `cache_operations_total{operation="hits"} ${metrics.hits}`,
      `cache_operations_total{operation="misses"} ${metrics.misses}`,
      `cache_operations_total{operation="sets"} ${metrics.sets}`,
      `cache_operations_total{operation="deletes"} ${metrics.deletes}`,
      `cache_operations_total{operation="errors"} ${metrics.errors}`,
      '',
      `# HELP cache_hit_rate Cache hit rate percentage`,
      `# TYPE cache_hit_rate gauge`,
      `cache_hit_rate ${metrics.hitRate}`,
      '',
      `# HELP cache_average_response_time Average response time in milliseconds`,
      `# TYPE cache_average_response_time gauge`,
      `cache_average_response_time ${metrics.averageResponseTime}`,
      '',
      `# HELP cache_total_operations Total cache operations`,
      `# TYPE cache_total_operations counter`,
      `cache_total_operations ${metrics.totalOperations}`,
    ].join('\n');
  }
}