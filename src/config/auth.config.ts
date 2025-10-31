import { ConfigFactory, registerAs } from '@nestjs/config';

export const authConfig: ConfigFactory = registerAs('auth', () => ({
  // Token 配置
  token: {
    expiresIn: Number.parseInt(process.env.AUTH_TOKEN_EXPIRES_IN || '3600', 10), // 默认1小时
    bytesLength: Number.parseInt(process.env.AUTH_TOKEN_BYTES_LENGTH || '32', 10), // 默认32字节
  },

  // Redis 配置
  redis: {
    keyPrefix: process.env.AUTH_REDIS_KEY_PREFIX || 'auth:token:',
  },

  // 安全配置
  security: {
    bcryptRounds: Number.parseInt(process.env.AUTH_BCRYPT_ROUNDS || '10', 10), // 默认10轮
    maxLoginAttempts: Number.parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5', 10), // 最大登录尝试次数
    lockoutTime: Number.parseInt(process.env.AUTH_LOCKOUT_TIME || '900', 10), // 锁定时间15分钟
  },
}));