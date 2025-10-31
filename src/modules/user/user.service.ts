import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { CacheService } from '../redis/cache.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly CACHE_TTL = 3600; // 1小时缓存

  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 根据ID查找用户（带缓存）
   */
  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:id:${id}`;

    try {
      // 尝试从缓存获取
      const cachedUser = await this.cacheService.get<User>(cacheKey);
      if (cachedUser) {
        this.logger.debug(`从缓存获取用户: ${id}`);
        return cachedUser;
      }

      // 缓存未命中，从数据库获取
      const user = await this.userRepository.findById(id);
      if (user) {
        // 存入缓存
        await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
        this.logger.debug(`用户数据已缓存: ${id}`);
      }

      return user;
    } catch (error) {
      this.logger.error(`根据ID查找用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据用户名查找用户（带缓存）
   */
  async findByUserName(userName: string): Promise<User | null> {
    const cacheKey = `user:username:${userName}`;

    try {
      // 尝试从缓存获取
      const cachedUser = await this.cacheService.get<User>(cacheKey);
      if (cachedUser) {
        this.logger.debug(`从缓存获取用户: ${userName}`);
        return cachedUser;
      }

      // 缓存未命中，从数据库获取
      const user = await this.userRepository.findByUserName(userName);
      if (user) {
        // 存入缓存
        await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
        this.logger.debug(`用户数据已缓存: ${userName}`);
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
      const user = await this.userRepository.create(userData);

      // 清理相关缓存
      await this.clearUserCache(user.id, user.userName);

      this.logger.log(`创建用户成功: ${user.userName}`);
      return user;
    } catch (error) {
      this.logger.error(`创建用户失败: ${userData.userName}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新用户
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    try {
      // 先获取旧的用户信息用于清理缓存
      const oldUser = await this.userRepository.findById(id);

      const updatedUser = await this.userRepository.update(id, userData);

      // 清理相关缓存
      await this.clearUserCache(id, oldUser?.userName, userData.userName);

      this.logger.log(`更新用户成功: ${id}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`更新用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    try {
      // 先获取用户信息用于清理缓存
      const user = await this.userRepository.findById(id);

      await this.userRepository.delete(id);

      // 清理相关缓存
      if (user) {
        await this.clearUserCache(user.id, user.userName);
      }

      this.logger.log(`删除用户成功: ${id}`);
    } catch (error) {
      this.logger.error(`删除用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查用户名是否存在
   */
  async existsByUserName(userName: string): Promise<boolean> {
    const cacheKey = `user:exists:username:${userName}`;

    try {
      // 尝试从缓存获取
      const cachedResult = await this.cacheService.get<boolean>(cacheKey);
      if (cachedResult !== undefined) {
        this.logger.debug(`从缓存获取用户名存在性检查: ${userName}`);
        return cachedResult;
      }

      // 缓存未命中，从数据库检查
      const exists = await this.userRepository.existsByUserName(userName);

      // 存入缓存（较短的TTL，因为存在性可能经常变化）
      await this.cacheService.set(cacheKey, exists, 300); // 5分钟缓存

      return exists;
    } catch (error) {
      this.logger.error(`检查用户名是否存在失败: ${userName}`, error.stack);
      throw error;
    }
  }

  /**
   * 清理用户相关缓存
   */
  private async clearUserCache(
    userId?: string,
    oldUserName?: string,
    newUserName?: string,
  ): Promise<void> {
    const keysToDelete: string[] = [];

    if (userId) {
      keysToDelete.push(`user:id:${userId}`);
    }

    // 清理用户名相关的缓存
    const userNames = new Set<string>();
    if (oldUserName) userNames.add(oldUserName);
    if (newUserName && newUserName !== oldUserName) userNames.add(newUserName);

    for (const userName of userNames) {
      keysToDelete.push(`user:username:${userName}`);
      keysToDelete.push(`user:exists:username:${userName}`);
    }

    // 批量删除缓存
    const deletePromises = keysToDelete.map(key =>
      this.cacheService.delete(key).catch(error =>
        this.logger.warn(`清理缓存失败: ${key}`, error.stack)
      )
    );

    await Promise.all(deletePromises);

    if (keysToDelete.length > 0) {
      this.logger.debug(`已清理用户缓存: ${keysToDelete.join(', ')}`);
    }
  }
}