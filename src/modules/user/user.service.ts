import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { Cacheable, DEFAULT_TTL_CONFIG } from '@/common/cache';
import { CacheManagementService } from '@/common/cache';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheManagementService: CacheManagementService,
  ) {}

  /**
   * 根据ID查找用户（带缓存 - 1小时）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findById(id: string): Promise<User | null> {
    this.logger.debug(`执行数据库查询获取用户: ${id}`);
    return this.userRepository.findById(id);
  }

  /**
   * 根据用户名查找用户（带缓存 - 1小时）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findByUserName(userName: string): Promise<User | null> {
    this.logger.debug(`执行数据库查询获取用户: ${userName}`);
    return this.userRepository.findByUserName(userName);
  }

  /**
   * 检查用户名是否存在（带缓存 - 5分钟）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
  async existsByUserName(userName: string): Promise<boolean> {
    this.logger.debug(`执行数据库查询检查用户名存在性: ${userName}`);
    return this.userRepository.existsByUserName(userName);
  }

  /**
   * 创建用户（无缓存）
   */
  async create(userData: Partial<User>): Promise<User> {
    this.logger.debug(`创建用户: ${userData.userName}`);
    const savedUser = await this.userRepository.create(userData);

    // 清理相关缓存
    await this.clearUserRelatedCache(savedUser.id, savedUser.userName);

    return savedUser;
  }

  /**
   * 更新用户（无缓存）
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.debug(`更新用户: ${id}`);

    // 获取更新前的用户名，用于缓存清理
    const oldUser = await this.userRepository.findById(id);
    const updatedUser = await this.userRepository.update(id, userData);

    // 清理相关缓存
    await this.clearUserRelatedCache(id, oldUser?.userName, userData.userName);

    return updatedUser;
  }

  /**
   * 删除用户（无缓存）
   */
  async delete(id: string): Promise<void> {
    this.logger.debug(`删除用户: ${id}`);

    // 获取用户信息用于缓存清理
    const user = await this.userRepository.findById(id);
    await this.userRepository.delete(id);

    // 清理相关缓存
    if (user) {
      await this.clearUserRelatedCache(user.id, user.userName);
    }
  }

  /**
   * 清理用户相关缓存
   */
  private async clearUserRelatedCache(
    userId?: string,
    oldUserName?: string,
    newUserName?: string,
  ): Promise<void> {
    try {
      // 清理根据ID查询的缓存
      if (userId) {
        await this.cacheManagementService.clearMethodCacheWithArgs(
          'UserService',
          'findById',
          [userId]
        );
      }

      // 清理根据用户名查询的缓存
      const userNames = new Set<string>();
      if (oldUserName) userNames.add(oldUserName);
      if (newUserName && newUserName !== oldUserName) userNames.add(newUserName);

      for (const userName of userNames) {
        await this.cacheManagementService.clearMethodCacheWithArgs(
          'UserService',
          'findByUserName',
          [userName]
        );
        await this.cacheManagementService.clearMethodCacheWithArgs(
          'UserService',
          'existsByUserName',
          [userName]
        );
      }

      this.logger.debug(`已清理用户相关缓存: ID=${userId}, 用户名=${Array.from(userNames).join(',')}`);
    } catch (error) {
      this.logger.warn('清理用户缓存失败', error.stack);
      // 缓存清理失败不应影响主要功能
    }
  }
}