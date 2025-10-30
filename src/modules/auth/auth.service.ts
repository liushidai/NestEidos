import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../redis/cache.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {}

  /**
   * 用户注册
   */
  async register(registerUserDto: RegisterUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOneBy({
      userName: registerUserDto.userName,
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 密码加密
    const bcryptRounds = this.configService.get<number>('auth.security.bcryptRounds') || 10;
    const hashedPassword = await bcrypt.hash(registerUserDto.passWord, bcryptRounds);

    // 创建用户
    const user = this.userRepository.create({
      ...registerUserDto,
      passWord: hashedPassword,
    });

    // 保存用户
    return this.userRepository.save(user);
  }

  /**
   * 用户登录
   */
  async login(loginUserDto: LoginUserDto): Promise<{ token: string; expires_in: number }> {
    // 查找用户
    const user = await this.userRepository.findOneBy({
      userName: loginUserDto.userName,
    });

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
      const expiresIn = this.configService.get<number>('auth.token.expiresIn') || 3600;
      const redisKeyPrefix = this.configService.get<string>('auth.redis.keyPrefix') || 'auth:token:';

      // 存储到 Redis
      await this.cacheService.set(
        `${redisKeyPrefix}${token}`,
        {
          userId: user.id,
          userName: user.userName,
          userType: user.userType,
        },
        `${expiresIn}s`, // cacheable 使用字符串格式的时间
      );

      this.logger.log(`用户 ${user.userName} 登录成功，Token: ${token.substring(0, 8)}...`);

      return {
        token,
        expires_in: expiresIn,
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
      const redisKeyPrefix = this.configService.get<string>('auth.redis.keyPrefix') || 'auth:token:';
      const userData = await this.cacheService.get<any>(`${redisKeyPrefix}${token}`);

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
      const redisKeyPrefix = this.configService.get<string>('auth.redis.keyPrefix') || 'auth:token:';
      await this.cacheService.delete(`${redisKeyPrefix}${token}`);
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
    return this.userRepository.findOneBy({ userName });
  }
}