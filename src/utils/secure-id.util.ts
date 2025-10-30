import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 安全图床 ID 编解码器
 *
 * 功能：
 * - 将 64 位雪花 ID 编码为不可预测的短字符串 URL 路径
 * - 支持可逆解码：URL 路径 → 原始 ID
 * - 防止批量扫描：通过密钥驱动的 Feistel 网络置换混淆 ID
 *
 * 安全设计：
 * - 使用基于 HMAC-SHA256 的 12 轮 Feistel 网络 PRP
 * - 密钥从环境变量加载，不硬编码
 * - Base62 编码生成 URL 安全的短字符串（≤ 11 字符）
 * - 严格输入校验和错误处理
 */
@Injectable()
export class SecureIdUtil {
  private static instance: SecureIdUtil;
  private readonly logger = new Logger(SecureIdUtil.name);

  // Feistel 网络轮数
  private readonly rounds = 12;

  // HMAC 密钥（32字节 = 256位）
  private readonly key: Buffer;

  // Base62 字符集
  private readonly base62Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  constructor(private readonly configService: ConfigService) {
    // 从配置服务获取密钥，优先使用新配置项
    let secretKey = this.configService.get<string>('SECURE_ID_SECRET_KEY');

    // 兼容旧的 SECRET_KEY 配置
    if (!secretKey) {
      secretKey = this.configService.get<string>('SECRET_KEY');
      this.logger.warn('Using deprecated SECRET_KEY config. Please migrate to SECURE_ID_SECRET_KEY');
    }

    if (!secretKey) {
      throw new Error('SECURE_ID_SECRET_KEY environment variable is required');
    }

    // 支持 hex 和 base64 格式的密钥输入
    if (secretKey.startsWith('hex:')) {
      this.key = Buffer.from(secretKey.slice(4), 'hex');
    } else if (secretKey.startsWith('base64:')) {
      this.key = Buffer.from(secretKey.slice(7), 'base64');
    } else {
      // 默认当作 hex 处理
      this.key = Buffer.from(secretKey, 'hex');
    }

    // 规范化密钥为32字节：如果密钥不是32字节，则通过SHA256哈希得到32字节
    if (this.key.length !== 32) {
      this.logger.warn(`Key length is ${this.key.length} bytes, normalizing to 32 bytes via SHA256`);
      this.key = crypto.createHash('sha256').update(this.key).digest();
    }

    this.logger.log('Secure ID utility initialized with Feistel network PRP');
  }

  /**
   * 获取单例实例（仅测试使用，建议通过 NestJS DI 注入）
   * @deprecated 建议使用依赖注入而非单例模式
   */
  public static getInstance(configService: ConfigService): SecureIdUtil {
    if (!SecureIdUtil.instance) {
      SecureIdUtil.instance = new SecureIdUtil(configService);
    }
    return SecureIdUtil.instance;
  }

  /**
   * Feistel 网络轮函数 F_i
   * F_i(R) = Trunc32(HMAC-SHA256(key, R || i))
   * @param round 轮次编号（1-12）
   * @param r32 32位右半部分
   * @returns 32位输出
   */
  private fi(round: number, r32: bigint): bigint {
    // 创建8字节缓冲区：4字节R + 4字节轮次
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Number(r32 & 0xffffffffn), 0);
    buf.writeUInt32BE(round, 4);

    // 计算 HMAC-SHA256
    const mac = crypto.createHmac('sha256', this.key).update(buf).digest();

    // 截取前4字节作为32位输出
    return BigInt(mac.readUInt32BE(0));
  }

  /**
   * Feistel 网络加密（编码）
   * @param id64 64位输入
   * @returns 64位置换输出
   */
  private feistelEncrypt(id64: bigint): bigint {
    const mask32 = 0xffffffffn;
    let L = (id64 >> 32n) & mask32; // 高32位
    let R = id64 & mask32;           // 低32位

    // Feistel 轮次
    for (let i = 1; i <= this.rounds; i++) {
      const F = this.fi(i, R);
      const tmp = L ^ F;
      L = R;
      R = tmp;
    }

    return (L << 32n) | R;
  }

  /**
   * Feistel 网络解密（解码）
   * @param p64 64位置换值
   * @returns 64位原始值
   */
  private feistelDecrypt(p64: bigint): bigint {
    const mask32 = 0xffffffffn;
    let L = (p64 >> 32n) & mask32; // 高32位
    let R = p64 & mask32;           // 低32位

    // 反向 Feistel 轮次
    for (let i = this.rounds; i >= 1; i--) {
      const F = this.fi(i, L);
      const tmp = R ^ F;
      R = L;
      L = tmp;
    }

    return (L << 32n) | R;
  }

  /**
   * 编码雪花 ID 为短字符串 URL 路径
   * @param snowflakeId 64 位雪花 ID（bigint）
   * @returns Base62 编码的短字符串（≤ 11 字符）
   */
  public encode(snowflakeId: bigint): string {
    if (typeof snowflakeId !== 'bigint' || snowflakeId < 0n) {
      throw new BadRequestException('Invalid snowflake ID: must be a non-negative bigint');
    }

    try {
      // 处理超出64位的数值：截取低64位
      const maskedId = snowflakeId & ((1n << 64n) - 1n);

      // Feistel 置换
      const permuted = this.feistelEncrypt(maskedId);

      // Base62 编码
      return this.base62Encode(permuted);
    } catch (error) {
      this.logger.error('Failed to encode ID', error instanceof Error ? error.stack : String(error));
      throw new BadRequestException('Failed to encode secure ID');
    }
  }

  /**
   * 解码短字符串 URL 路径为原始雪花 ID
   * @param encodedId Base62 编码的短字符串（≤ 11 字符）
   * @returns 原始 64 位雪花 ID（bigint）
   */
  public decode(encodedId: string): bigint {
    if (!encodedId || typeof encodedId !== 'string') {
      throw new BadRequestException('Invalid encoded ID: must be a non-empty string');
    }

    // 严格校验：Base62 字符集（优先检查字符集）
    if (!this.isValidBase62(encodedId)) {
      throw new BadRequestException('Invalid encoded ID: contains invalid Base62 characters');
    }

    // 严格校验：长度限制 1-11 字符
    if (encodedId.length === 0 || encodedId.length > 11) {
      throw new BadRequestException('Invalid encoded ID: length must be between 1 and 11 characters');
    }

    try {
      // Base62 解码为 bigint
      const permuted = this.base62Decode(encodedId);

      // Feistel 逆置换
      const original = this.feistelDecrypt(permuted);

      return original;
    } catch (error) {
      this.logger.error('Failed to decode ID', error instanceof Error ? error.stack : String(error));
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
   * 验证 HMAC 密钥是否有效
   * @returns 密钥是否有效
   */
  public isKeyValid(): boolean {
    return this.key && this.key.length === 32;
  }

  /**
   * 获取密钥长度（字节）
   * @returns 密钥长度
   */
  public getKeyLength(): number {
    return this.key?.length || 0;
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
      this.logger.error('Encode-decode roundtrip validation failed', error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  /**
   * 获取 Feistel 网络轮数
   * @returns 轮数
   */
  public getRounds(): number {
    return this.rounds;
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