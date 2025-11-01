import { Injectable, UnauthorizedException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { CacheService, TTL_CONFIGS, TTLUtils, TTLUnit, CacheKeyUtils } from '@/cache';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRepository } from '../user/repositories/user.repository';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userRepository: UserRepository,
    private cacheService: CacheService,
    private configService: ConfigService,
    @Inject('TTL_CONFIGS') private readonly ttlConfigs: typeof TTL_CONFIGS,
  ) {}

  /**
   * 用户注册
   */
  async register(registerUserDto: RegisterUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findByUserName(registerUserDto.userName);

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 密码加密
    const bcryptRounds = this.configService.get<number>('auth.security.bcryptRounds') || 10;
    const hashedPassword = await bcrypt.hash(registerUserDto.passWord, bcryptRounds);

    // 创建用户
    const userData = {
      ...registerUserDto,
      passWord: hashedPassword,
    };

    return this.userRepository.create(userData);
  }

  /**
   * 获取token的完整缓存键
   */
  private getTokenCacheKey(token: string): string {
    return CacheKeyUtils.buildAuthKey('token', token);
  }

  /**
   * 用户登录
   */
  async login(loginUserDto: LoginUserDto): Promise<{ token: string; expires_in: number }> {
    // 查找用户
    const user = await this.userRepository.findByUserName(loginUserDto.userName);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.userStatus !== 1) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginUserDto.passWord, user.passWord);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    try {
      // 生成 token
      const token = this.generateToken();

      // 使用统一的TTL配置，支持动态覆盖
      const configuredExpiresIn = this.configService.get<number>('auth.token.expiresIn');
      let tokenTTL = this.ttlConfigs.AUTH_TOKEN;

      if (configuredExpiresIn) {
        // 如果配置中有具体的过期时间，创建动态TTL配置
        tokenTTL = TTLUtils.createDynamicTTL(configuredExpiresIn, TTLUnit.HOURS);
      }

      // 存储到 Redis（使用统一的TTL配置）
      await this.cacheService.set(
        this.getTokenCacheKey(token),
        {
          userId: user.id,
          userName: user.userName,
          userType: user.userType,
        },
        tokenTTL, // 使用TTLConfig对象
      );

      const expiresInSeconds = TTLUtils.toSeconds(tokenTTL);

      this.logger.log(`用户 ${user.userName} 登录成功，Token: ${token.substring(0, 8)}..., TTL: ${TTLUtils.getDescription(tokenTTL)}`);

      return {
        token,
        expires_in: expiresInSeconds,
      };
    } catch (error) {
      this.logger.error(`登录过程中 Redis 操作失败: ${error.message}`, error.stack);
      throw new UnauthorizedException('登录失败，请稍后重试');
    }
  }

  /**
   * 验证 token
   */
  async validateToken(token: string): Promise<any> {
    try {
      const userData = await this.cacheService.get<any>(this.getTokenCacheKey(token));

      if (!userData) {
        return null;
      }

      this.logger.verbose(`Token 验证成功: ${token.substring(0, 8)}..., 用户: ${userData.userName}`);
      return userData;
    } catch (error) {
      this.logger.error(`Token 验证过程中 Redis 操作失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 注销
   */
  async logout(token: string): Promise<void> {
    try {
      await this.cacheService.delete(this.getTokenCacheKey(token));
      this.logger.log(`用户注销成功，Token: ${token.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error(`注销过程中 Redis 操作失败: ${error.message}`, error.stack);
      // 即使 Redis 删除失败，也不抛出异常，因为 token 会自然过期
    }
  }

  /**
   * 生成高强度随机 token
   */
  private generateToken(): string {
    const bytesLength = this.configService.get<number>('auth.token.bytesLength') || 32;
    return randomBytes(bytesLength).toString('hex');
  }

  /**
   * 根据用户名查找用户
   */
  async findByUserName(userName: string): Promise<User | null> {
    return this.userRepository.findByUserName(userName);
  }

  /**
   * 刷新token有效期
   */
  async refreshToken(token: string): Promise<{ success: boolean; expires_in?: number }> {
    try {
      const userData = await this.cacheService.get<any>(this.getTokenCacheKey(token));

      if (!userData) {
        return { success: false };
      }

      // 使用统一的TTL配置
      const configuredExpiresIn = this.configService.get<number>('auth.token.expiresIn');
      let tokenTTL = this.ttlConfigs.AUTH_TOKEN;

      if (configuredExpiresIn) {
        tokenTTL = TTLUtils.createDynamicTTL(configuredExpiresIn, TTLUnit.HOURS);
      }

      // 重新设置token和过期时间
      await this.cacheService.set(
        this.getTokenCacheKey(token),
        userData,
        tokenTTL
      );

      const expiresInSeconds = TTLUtils.toSeconds(tokenTTL);

      this.logger.log(`Token 刷新成功: ${token.substring(0, 8)}..., 用户: ${userData.userName}, TTL: ${TTLUtils.getDescription(tokenTTL)}`);
      return { success: true, expires_in: expiresInSeconds };
    } catch (error) {
      this.logger.error(`Token 刷新过程中 Redis 操作失败: ${error.message}`, error.stack);
      return { success: false };
    }
  }

  /**
   * 批量注销用户的所有token（用于用户修改密码等场景）
   */
  async revokeAllUserTokens(userId: string): Promise<{ revokedCount: number }> {
    // 注意：这个方法需要额外的数据结构来跟踪用户的token
    // 在当前实现中，只能通过模式匹配删除，这在Redis中性能较差
    // 建议在生产环境中使用额外的数据结构（如Set）来跟踪用户的活跃token

    this.logger.warn(`批量注销用户token功能暂未实现，用户ID: ${userId}`);
    return { revokedCount: 0 };
  }

  /**
   * 获取token剩余有效时间（秒）
   */
  async getTokenTtl(token: string): Promise<number | null> {
    try {
      const userData = await this.cacheService.get<any>(this.getTokenCacheKey(token));
      if (!userData) {
        return null;
      }

      // 注意：CacheService目前没有直接提供TTL查询功能
      // 这里返回一个估计值，实际应用中可能需要扩展CacheService
      const expiresIn = this.configService.get<number>('auth.token.expiresIn') || 3600;
      return expiresIn; // 简化实现，返回配置的过期时间
    } catch (error) {
      this.logger.error(`获取token TTL失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 验证token并自动刷新（如果接近过期）
   */
  async validateAndRefreshToken(token: string, refreshThreshold: number = 300): Promise<any> {
    // refreshThreshold默认为5分钟（300秒）
    const userData = await this.validateToken(token);

    if (!userData) {
      return null;
    }

    // 检查是否需要刷新token
    const ttl = await this.getTokenTtl(token);
    if (ttl && ttl <= refreshThreshold) {
      const refreshResult = await this.refreshToken(token);
      if (refreshResult.success) {
        this.logger.verbose(`Token 自动刷新成功: ${token.substring(0, 8)}...`);
      }
    }

    return userData;
  }
}