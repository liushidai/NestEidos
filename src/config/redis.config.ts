import { ConfigFactory, registerAs } from '@nestjs/config';

export const redisConfig: ConfigFactory = registerAs('redis', () => ({
  // 基本连接配置
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number.parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'nest_eidos:',

  // 连接池配置
  maxRetriesPerRequest: Number.parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  retryDelayOnFailover: Number.parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
  enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',

  // 超时配置（毫秒）
  connectTimeout: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  commandTimeout: Number.parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),

  // 连接池配置
  family: 4, // IPv4
  keepAlive: true,
  lazyConnect: true,

  // 高级配置
  maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
  slowLogLogSlowerThan: Number.parseInt(process.env.REDIS_SLOW_LOG_SLOWER_THAN || '10000', 10),
}));