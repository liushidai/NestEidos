import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { SimpleCacheService } from '@/common/cache';
import { TTL_CONFIGS, TTLUtils } from '@/common/ttl/tls.config';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: SimpleCacheService,
  ) {}

  /**
   * 根据ID查找用户（带缓存）
   */
  async findById(id: string): Promise<User | null> {
    try {
      const cacheKey = `user:id:${id}`;

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
   * 根据用户名查找用户（无缓存，仅用于内部业务逻辑）
   * 注意：此方法不使用缓存，仅用于需要实时查询的业务场景
   */
  async findByUserName(userName: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ userName });
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

      this.logger.log(`创建用户成功: ${savedUser.userName}`);
      return savedUser;
    } catch (error) {
      this.logger.error(`创建用户失败: ${userData.userName}`, error.stack);
      throw error;
    }
  }
}