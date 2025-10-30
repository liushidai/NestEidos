import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 安全图床 ID 编解码器
 *
 * 功能：
 * - 将 64 位雪花 ID 编码为不可预测的短字符串 URL 路径
 * - 支持可逆解码：URL 路径 → 原始 ID
 * - 防止批量扫描：通过 AES-256-CTR 加密混淆 ID
 *
 * 安全设计：
 * - 使用 AES-256-CTR 模式加密
 * - 密钥从环境变量加载，不硬编码
 * - Base62 编码生成 URL 安全的短字符串
 * - 使用 bigint 处理 64 位无符号整数，避免精度丢失
 */
@Injectable()
export class SecureIdUtil {
  private static instance: SecureIdUtil;
  private readonly logger = new Logger(SecureIdUtil.name);

  // 加密密钥（32字节 = 256位）
  private readonly encryptionKey: Buffer;

  // 固定 IV（16字节）
  private readonly iv = Buffer.alloc(16, 0);

  // Base62 字符集
  private readonly base62Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  constructor(private readonly configService: ConfigService) {
    // 从配置服务获取密钥
    const secretKey = this.configService.get<string>('SECRET_KEY');
    if (!secretKey) {
      throw new Error('SECRET_KEY environment variable is required');
    }

    // 支持 hex 和 base64 格式的密钥输入
    if (secretKey.startsWith('hex:')) {
      this.encryptionKey = Buffer.from(secretKey.slice(4), 'hex');
    } else if (secretKey.startsWith('base64:')) {
      this.encryptionKey = Buffer.from(secretKey.slice(7), 'base64');
    } else {
      // 默认当作 hex 处理
      this.encryptionKey = Buffer.from(secretKey, 'hex');
    }

    // 验证密钥长度
    if (this.encryptionKey.length !== 32) {
      throw new Error('SECRET_KEY must be 32 bytes (256 bits) for AES-256');
    }

    this.logger.log('Secure ID utility initialized with encryption key');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(configService: ConfigService): SecureIdUtil {
    if (!SecureIdUtil.instance) {
      SecureIdUtil.instance = new SecureIdUtil(configService);
    }
    return SecureIdUtil.instance;
  }

  /**
   * 编码雪花 ID 为短字符串 URL 路径
   * @param snowflakeId 64 位雪花 ID（bigint）
   * @returns Base62 编码的短字符串
   */
  public encode(snowflakeId: bigint): string {
    if (typeof snowflakeId !== 'bigint' || snowflakeId < 0n) {
      throw new BadRequestException('Invalid snowflake ID: must be a non-negative bigint');
    }

    try {
      // 将 bigint 转换为 8 字节大端序缓冲区
      const inputBuffer = Buffer.alloc(8);

      // 处理超出64位的数值：截取低64位
      const maskedId = snowflakeId & ((1n << 64n) - 1n);

      // 使用大端序写入 64 位无符号整数
      inputBuffer.writeBigUInt64BE(maskedId, 0);

      // AES-256-CTR 加密
      const cipher = crypto.createCipheriv('aes-256-ctr', this.encryptionKey, this.iv);
      const encryptedBuffer = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final(),
      ]);

      // 将加密结果解释为 64 位无符号整数（大端序）
      const encryptedBigInt = encryptedBuffer.readBigUInt64BE(0);

      // Base62 编码
      return this.base62Encode(encryptedBigInt);
    } catch (error) {
      this.logger.error('Failed to encode ID', error);
      throw new BadRequestException('Failed to encode secure ID');
    }
  }

  /**
   * 解码短字符串 URL 路径为原始雪花 ID
   * @param encodedId Base62 编码的短字符串
   *returns 原始 64 位雪花 ID（bigint）
   */
  public decode(encodedId: string): bigint {
    if (!encodedId || typeof encodedId !== 'string') {
      throw new BadRequestException('Invalid encoded ID: must be a non-empty string');
    }

    try {
      // Base62 解码为 bigint
      const encryptedBigInt = this.base62Decode(encodedId);

      // 将 bigint 转换为 8 字节大端序缓冲区
      const encryptedBuffer = Buffer.alloc(8);
      encryptedBuffer.writeBigUInt64BE(encryptedBigInt, 0);

      // AES-256-CTR 解密
      const decipher = crypto.createDecipheriv('aes-256-ctr', this.encryptionKey, this.iv);
      const decryptedBuffer = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);

      // 读取原始雪花 ID
      const snowflakeId = decryptedBuffer.readBigUInt64BE(0);

      return snowflakeId;
    } catch (error) {
      this.logger.error('Failed to decode ID', error);
      throw new BadRequestException('Invalid or corrupted secure ID');
    }
  }

  /**
   * Base62 编码（支持 64 位无符号整数）
   * @param num 要编码的数字
   * @returns Base62 编码字符串
   */
  private base62Encode(num: bigint): string {
    if (num === 0n) {
      return this.base62Chars[0];
    }

    const chars: string[] = [];
    let n = num;

    while (n > 0n) {
      const remainder = n % 62n;
      chars.unshift(this.base62Chars[Number(remainder)]);
      n = n / 62n;
    }

    return chars.join('');
  }

  /**
   * Base62 解码
   * @param str Base62 编码字符串
   * @returns 解码后的数字
   */
  private base62Decode(str: string): bigint {
    if (!str) {
      throw new Error('Empty string cannot be decoded');
    }

    let result = 0n;
    const base = 62n;

    for (const char of str) {
      const index = this.base62Chars.indexOf(char);
      if (index === -1) {
        throw new Error(`Invalid character '${char}' in Base62 string`);
      }
      result = result * base + BigInt(index);
    }

    return result;
  }

  /**
   * 验证加密密钥是否有效
   * @returns 密钥是否有效
   */
  public isKeyValid(): boolean {
    return this.encryptionKey && this.encryptionKey.length === 32;
  }

  /**
   * 获取密钥长度（字节）
   * @returns 密钥长度
   */
  public getKeyLength(): number {
    return this.encryptionKey?.length || 0;
  }

  /**
   * 验证字符串是否为有效的 Base62 编码
   * @param str 要验证的字符串
   * @returns 是否为有效的 Base62 编码
   */
  public isValidBase62(str: string): boolean {
    if (!str) return false;

    return [...str].every(char => this.base62Chars.includes(char));
  }

  /**
   * 编码验证：确保编码后再解码的结果与原始 ID 一致
   * @param snowflakeId 原始雪花 ID
   * @returns 验证是否通过
   */
  public validateEncodeDecodeRoundtrip(snowflakeId: bigint): boolean {
    try {
      const encoded = this.encode(snowflakeId);
      const decoded = this.decode(encoded);
      // 对于超出64位的ID，只验证低64位是否一致
      const expectedId = snowflakeId & ((1n << 64n) - 1n);
      return decoded === expectedId;
    } catch (error) {
      this.logger.error('Encode-decode roundtrip validation failed', error);
      return false;
    }
  }

  /**
   * 批量编码雪花 ID 数组
   * @param snowflakeIds 雪花 ID 数组
   * @returns 编码后的字符串数组
   */
  public encodeBatch(snowflakeIds: bigint[]): string[] {
    return snowflakeIds.map(id => this.encode(id));
  }

  /**
   * 批量解码字符串数组
   * @param encodedIds 编码字符串数组
   * @returns 解码后的雪花 ID 数组
   */
  public decodeBatch(encodedIds: string[]): bigint[] {
    return encodedIds.map(id => this.decode(id));
  }
}