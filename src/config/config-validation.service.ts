import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 配置校验服务
 *
 * 在应用启动时验证关键环境配置，确保配置合法且完整
 * 缺失或不合法的配置将导致应用启动失败
 */
@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 验证所有关键配置
   * @throws 当配置不合法时抛出错误
   */
  public validateAll(): void {
    this.logger.log('开始验证环境配置...');

    const validations = [
      () => this.validateDatabaseConfig(),
      () => this.validateRedisConfig(),
      () => this.validateMinioConfig(),
      () => this.validateSecureIdConfig(),
      () => this.validateAuthConfig(),
    ];

    for (const validation of validations) {
      validation();
    }

    this.logger.log('✅ 所有配置验证通过');
  }

  /**
   * 验证关键配置（可选模式，允许部分配置失败）
   * @param skipOptional 跳过可选配置验证
   * @returns 验证结果，包含成功和失败的配置项
   */
  public validateCritical(skipOptional: boolean = false): {
    success: string[];
    failed: string[];
    warnings: string[];
  } {
    this.logger.log('开始验证关键环境配置...');

    const result = {
      success: [] as string[],
      failed: [] as string[],
      warnings: [] as string[],
    };

    // 数据库配置是必需的
    try {
      this.validateDatabaseConfig();
      result.success.push('数据库配置');
    } catch (error) {
      result.failed.push(`数据库配置: ${error.message}`);
    }

    // Redis 配置是必需的
    try {
      this.validateRedisConfig();
      result.success.push('Redis配置');
    } catch (error) {
      result.failed.push(`Redis配置: ${error.message}`);
    }

    // 其他配置根据 skipOptional 参数决定是否验证
    if (!skipOptional) {
      try {
        this.validateMinioConfig();
        result.success.push('MinIO配置');
      } catch (error) {
        result.warnings.push(`MinIO配置: ${error.message}`);
      }

      try {
        this.validateSecureIdConfig();
        result.success.push('安全ID配置');
      } catch (error) {
        result.warnings.push(`安全ID配置: ${error.message}`);
      }

      try {
        this.validateAuthConfig();
        result.success.push('认证配置');
      } catch (error) {
        result.warnings.push(`认证配置: ${error.message}`);
      }
    }

    // 记录验证结果
    if (result.success.length > 0) {
      this.logger.log(`✅ 关键配置验证通过: ${result.success.join(', ')}`);
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((warning) => this.logger.warn(`⚠️ ${warning}`));
    }

    if (result.failed.length > 0) {
      result.failed.forEach((failure) => this.logger.error(`❌ ${failure}`));
      throw new Error(`❌ 关键配置验证失败，无法启动应用`);
    }

    return result;
  }

  /**
   * 验证数据库配置
   */
  private validateDatabaseConfig(): void {
    const requiredFields = [
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
    ];

    for (const field of requiredFields) {
      const value = this.configService.get<string>(field);
      if (!value || value.trim() === '') {
        throw new Error(`❌ 数据库配置缺失: ${field} 是必需的`);
      }
    }

    // 验证 DB_PORT
    const portStr = this.configService.get<string>('DB_PORT', '5432');
    const port = Number.parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        `❌ 数据库端口无效: DB_PORT 必须是 1-65535 之间的有效端口，当前值: ${portStr}`,
      );
    }

    this.logger.log('✅ 数据库配置验证通过');
  }

  /**
   * 验证 Redis 配置
   */
  private validateRedisConfig(): void {
    const host = this.configService.get<string>('REDIS_HOST');
    if (!host || host.trim() === '') {
      throw new Error('❌ Redis 配置缺失: REDIS_HOST 是必需的');
    }

    // 验证 REDIS_PORT
    const portStr = this.configService.get<string>('REDIS_PORT', '6379');
    const port = Number.parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        `❌ Redis 端口无效: REDIS_PORT 必须是 1-65535 之间的有效端口，当前值: ${portStr}`,
      );
    }

    // 验证 REDIS_DB
    const dbStr = this.configService.get<string>('REDIS_DB', '0');
    const db = Number.parseInt(dbStr, 10);
    if (isNaN(db) || db < 0 || db > 15) {
      throw new Error(
        `❌ Redis 数据库编号无效: REDIS_DB 必须是 0-15 之间的数字，当前值: ${dbStr}`,
      );
    }

    // REDIS_PASSWORD 是可选的，但如果提供了就检查
    const password = this.configService.get<string>('REDIS_PASSWORD');
    if (password !== undefined && password.trim() === '') {
      this.logger.warn('⚠️ REDIS_PASSWORD 已设置但为空字符串');
    }

    this.logger.log('✅ Redis 配置验证通过');
  }

  /**
   * 验证 MinIO 配置
   */
  private validateMinioConfig(): void {
    const requiredFields = [
      'MINIO_ENDPOINT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_BUCKET',
    ];

    for (const field of requiredFields) {
      const value = this.configService.get<string>(field);
      if (!value || value.trim() === '') {
        throw new Error(`❌ MinIO 配置缺失: ${field} 是必需的`);
      }
    }

    // 验证 MINIO_ACCESS_KEY 长度（MinIO 要求至少 3 个字符）
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY')!;
    if (accessKey.length < 3) {
      throw new Error(
        `❌ MinIO Access Key 无效: 长度必须至少为 3 个字符，当前长度: ${accessKey.length}`,
      );
    }

    // 验证 MINIO_SECRET_KEY 长度（MinIO 要求至少 8 个字符）
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY')!;
    if (secretKey.length < 8) {
      throw new Error(
        `❌ MinIO Secret Key 无效: 长度必须至少为 8 个字符，当前长度: ${secretKey.length}`,
      );
    }

    // 验证 MINIO_PORT
    const portStr = this.configService.get<string>('MINIO_PORT', '9000');
    const port = Number.parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        `❌ MinIO 端口无效: MINIO_PORT 必须是 1-65535 之间的有效端口，当前值: ${portStr}`,
      );
    }

    // 验证 MINIO_USE_SSL
    const useSslStr = this.configService.get<string>('MINIO_USE_SSL', 'false');
    if (!['true', 'false'].includes(useSslStr.toLowerCase())) {
      throw new Error(
        `❌ MinIO SSL 配置无效: MINIO_USE_SSL 必须是 'true' 或 'false'，当前值: ${useSslStr}`,
      );
    }

    this.logger.log('✅ MinIO 配置验证通过');
  }

  /**
   * 验证安全 ID 加密配置
   */
  private validateSecureIdConfig(): void {
    const secretKey = this.configService.get<string>('SECURE_ID_SECRET_KEY');
    if (!secretKey || secretKey.trim() === '') {
      throw new Error('❌ 安全 ID 配置缺失: SECURE_ID_SECRET_KEY 是必需的');
    }

    let keyBuffer: Buffer;
    try {
      // 支持 hex 和 base64 格式的密钥输入
      if (secretKey.startsWith('hex:')) {
        keyBuffer = Buffer.from(secretKey.slice(4), 'hex');
      } else if (secretKey.startsWith('base64:')) {
        keyBuffer = Buffer.from(secretKey.slice(7), 'base64');
      } else {
        // 默认当作 hex 处理
        keyBuffer = Buffer.from(secretKey, 'hex');
      }
    } catch (error) {
      throw new Error(
        `❌ SECURE_ID_SECRET_KEY 格式无效: 无法解析为 hex 或 base64 格式`,
      );
    }

    // 验证密钥长度（解析后应该是 32 字节）
    if (keyBuffer.length === 0) {
      throw new Error('❌ SECURE_ID_SECRET_KEY 无效: 解析后的密钥长度为 0');
    }

    // 检查是否为弱密钥
    if (this.isWeakKey(secretKey)) {
      throw new Error(
        `❌ SECURE_ID_SECRET_KEY 安全风险: 检测到弱密钥或示例密钥，请使用强随机密钥。生成命令: openssl rand -hex 32`,
      );
    }

    this.logger.log(
      `✅ 安全 ID 配置验证通过 (密钥长度: ${keyBuffer.length} 字节)`,
    );
  }

  /**
   * 验证认证系统配置
   */
  private validateAuthConfig(): void {
    // 验证 AUTH_TOKEN_EXPIRES_IN
    const expiresStr = this.configService.get<string>(
      'AUTH_TOKEN_EXPIRES_IN',
      '3600',
    );
    const expires = Number.parseInt(expiresStr, 10);
    if (isNaN(expires) || expires < 60 || expires > 86400) {
      throw new Error(
        `❌ Token 过期时间无效: AUTH_TOKEN_EXPIRES_IN 必须是 60-86400 秒之间的数字，当前值: ${expiresStr}`,
      );
    }

    // 验证 AUTH_TOKEN_BYTES_LENGTH
    const bytesStr = this.configService.get<string>(
      'AUTH_TOKEN_BYTES_LENGTH',
      '32',
    );
    const bytes = Number.parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes < 16 || bytes > 64) {
      throw new Error(
        `❌ Token 字节长度无效: AUTH_TOKEN_BYTES_LENGTH 必须是 16-64 之间的数字，当前值: ${bytesStr}`,
      );
    }

    // 验证 AUTH_BCRYPT_ROUNDS
    const roundsStr = this.configService.get<string>(
      'AUTH_BCRYPT_ROUNDS',
      '10',
    );
    const rounds = Number.parseInt(roundsStr, 10);
    if (isNaN(rounds) || rounds < 10 || rounds > 15) {
      throw new Error(
        `❌ bcrypt 轮数无效: AUTH_BCRYPT_ROUNDS 必须是 10-15 之间的数字，当前值: ${roundsStr}`,
      );
    }

    // 验证 AUTH_MAX_LOGIN_ATTEMPTS
    const attemptsStr = this.configService.get<string>(
      'AUTH_MAX_LOGIN_ATTEMPTS',
      '5',
    );
    const attempts = Number.parseInt(attemptsStr, 10);
    if (isNaN(attempts) || attempts < 1 || attempts > 20) {
      throw new Error(
        `❌ 最大登录尝试次数无效: AUTH_MAX_LOGIN_ATTEMPTS 必须是 1-20 之间的数字，当前值: ${attemptsStr}`,
      );
    }

    // 验证 AUTH_LOCKOUT_TIME
    const lockoutStr = this.configService.get<string>(
      'AUTH_LOCKOUT_TIME',
      '900',
    );
    const lockout = Number.parseInt(lockoutStr, 10);
    if (isNaN(lockout) || lockout < 60 || lockout > 3600) {
      throw new Error(
        `❌ 锁定时间无效: AUTH_LOCKOUT_TIME 必须是 60-3600 秒之间的数字，当前值: ${lockoutStr}`,
      );
    }

    this.logger.log('✅ 认证配置验证通过');
  }

  /**
   * 检查是否为弱密钥或示例密钥
   * @param secretKey 密钥字符串
   * @returns 是否为弱密钥
   */
  private isWeakKey(secretKey: string): boolean {
    // 移除前缀进行检查
    const keyContent = secretKey.replace(/^(hex:|base64:)/, '');

    // 检查是否为已知的示例密钥
    const weakPatterns = [
      '1234567890abcdef', // 简单的重复模式
      'abcdef1234567890', // 简单的字母数字组合
      '0123456789abcdef', // 顺序字符
      'ffffffffffffffff', // 重复字符
      '0000000000000000', // 全零
      'deadbeefdeadbeef', // 常见的测试模式
    ];

    for (const pattern of weakPatterns) {
      if (keyContent.includes(pattern)) {
        return true;
      }
    }

    // 检查密钥长度是否过短（少于 16 字符的 hex 密钥）
    if (keyContent.length < 16) {
      return true;
    }

    // 检查字符熵（简单检查：是否只包含少数几种字符）
    const uniqueChars = new Set(keyContent.toLowerCase()).size;
    if (uniqueChars < 4) {
      return true;
    }

    return false;
  }

  /**
   * 获取配置验证摘要
   * @returns 配置验证摘要信息
   */
  public getValidationSummary(): Record<string, any> {
    return {
      database: {
        host: this.configService.get<string>('DB_HOST'),
        port: this.configService.get<string>('DB_PORT'),
        database: this.configService.get<string>('DB_DATABASE'),
        username: this.configService.get<string>('DB_USERNAME'),
      },
      redis: {
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<string>('REDIS_PORT'),
        db: this.configService.get<string>('REDIS_DB'),
      },
      minio: {
        endpoint: this.configService.get<string>('MINIO_ENDPOINT'),
        port: this.configService.get<string>('MINIO_PORT'),
        bucket: this.configService.get<string>('MINIO_BUCKET'),
        useSsl: this.configService.get<string>('MINIO_USE_SSL'),
      },
      auth: {
        tokenExpiresIn: this.configService.get<string>('AUTH_TOKEN_EXPIRES_IN'),
        bcryptRounds: this.configService.get<string>('AUTH_BCRYPT_ROUNDS'),
      },
      secureId: {
        keyConfigured: !!this.configService.get<string>('SECURE_ID_SECRET_KEY'),
      },
    };
  }
}
