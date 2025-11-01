import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { CacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils, NULL_CACHE_VALUES } from '../../../cache';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);
  private readonly redisKeyPrefix: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    // 使用配置中的 REDIS_KEY_PREFIX
    this.redisKeyPrefix = this.configService.get<string>('redis.keyPrefix') || 'nest_eidos:';
  }

  /**
   * 根据ID查找用户（带缓存）
   */
  async findById(id: string): Promise<User | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'user', 'id', id);

      // 尝试从缓存获取
      const cachedUser = await this.cacheService.get<User>(cacheKey);
      if (cachedUser) {
        this.logger.debug(`从缓存获取用户: ${id}`);
        return cachedUser;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取用户: ${id}`);
      const user = await this.userRepository.findOneBy({ id });

      // 缓存结果（24小时）
      if (user) {
        await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
      }

      return user;
    } catch (error) {
      this.logger.error(`根据ID查找用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据用户名查找用户（带缓存）
   * 注意：用户名不允许修改，可以安全地缓存
   */
  async findByUserName(userName: string): Promise<User | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'user', 'username', userName);

      // 尝试从缓存获取
      const cachedUser = await this.cacheService.get<User>(cacheKey);
      if (cachedUser) {
        this.logger.debug(`从缓存获取用户（用户名）: ${userName}`);
        return cachedUser;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取用户（用户名）: ${userName}`);
      const user = await this.userRepository.findOneBy({ userName });

      // 缓存结果（24小时）
      if (user) {
        await this.cacheService.set(cacheKey, user, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
      }

      return user;
    } catch (error) {
      this.logger.error(`根据用户名查找用户失败: ${userName}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建用户
   */
  async create(userData: Partial<User>): Promise<User> {
    try {
      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);

      // 预先清理用户名缓存，防止创建同名用户时的缓存冲突
      if (savedUser.userName) {
        const usernameCacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'user', 'username', savedUser.userName);
        await this.cacheService.delete(usernameCacheKey);
        this.logger.debug(`清理用户名缓存: ${savedUser.userName}`);
      }

      this.logger.log(`创建用户成功: ${savedUser.userName}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`创建用户失败: ${userData.userName}`, error.stack);
      throw error;
    }
  }
}