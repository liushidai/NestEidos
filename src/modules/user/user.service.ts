import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { SimpleCacheService } from '@/common/cache';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: SimpleCacheService,
  ) {}

  /**
   * 根据ID查找用户（带缓存 - 1小时）
   */
  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:id:${id}`;

    // 尝试从缓存获取
    const cachedUser = await this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      this.logger.debug(`从缓存获取用户: ${id}`);
      return cachedUser;
    }

    // 缓存未命中，从数据库获取
    this.logger.debug(`从数据库获取用户: ${id}`);
    const user = await this.userRepository.findById(id);

    // 缓存结果
    if (user) {
      await this.cacheService.set(cacheKey, user, 3600); // 1小时
    }

    return user;
  }

  /**
   * 根据用户名查找用户（带缓存 - 1小时）
   */
  async findByUserName(userName: string): Promise<User | null> {
    const cacheKey = `user:username:${userName}`;

    // 尝试从缓存获取
    const cachedUser = await this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      this.logger.debug(`从缓存获取用户: ${userName}`);
      return cachedUser;
    }

    // 缓存未命中，从数据库获取
    this.logger.debug(`从数据库获取用户: ${userName}`);
    const user = await this.userRepository.findByUserName(userName);

    // 缓存结果
    if (user) {
      await this.cacheService.set(cacheKey, user, 3600); // 1小时
    }

    return user;
  }

  /**
   * 检查用户名是否存在（带缓存 - 5分钟）
   */
  async existsByUserName(userName: string): Promise<boolean> {
    const cacheKey = `user:exists:${userName}`;

    // 尝试从缓存获取
    const cachedResult = await this.cacheService.get<boolean>(cacheKey);
    if (cachedResult !== null) {
      this.logger.debug(`从缓存获取用户名存在性: ${userName}`);
      return cachedResult;
    }

    // 缓存未命中，从数据库获取
    this.logger.debug(`从数据库检查用户名存在性: ${userName}`);
    const exists = await this.userRepository.existsByUserName(userName);

    // 缓存结果
    await this.cacheService.set(cacheKey, exists, 300); // 5分钟

    return exists;
  }

  /**
   * 创建用户（清理相关缓存）
   */
  async create(userData: Partial<User>): Promise<User> {
    this.logger.debug(`创建用户: ${userData.userName}`);
    const user = await this.userRepository.create(userData);

    // 清理相关缓存
    await this.clearUserCache(user.userName);

    return user;
  }

  /**
   * 更新用户（清理相关缓存）
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.debug(`更新用户: ${id}`);
    const { updatedUser } = await this.userRepository.update(id, userData);

    // 清理相关缓存
    await this.clearUserCache(updatedUser.userName, id);

    return updatedUser;
  }

  /**
   * 删除用户（清理相关缓存）
   */
  async delete(id: string): Promise<{ deleted: boolean; userName?: string }> {
    this.logger.debug(`删除用户: ${id}`);

    // 获取用户信息用于后续缓存清理
    const user = await this.userRepository.findById(id);
    await this.userRepository.delete(id);

    // 清理相关缓存
    if (user) {
      await this.clearUserCache(user.userName, id);
    }

    return {
      deleted: true,
      userName: user?.userName
    };
  }

  /**
   * 清理用户相关缓存
   * @param userName 用户名
   * @param userId 用户ID（可选）
   */
  private async clearUserCache(userName?: string, userId?: string): Promise<void> {
    const keysToDelete: string[] = [];

    // 清理用户名相关的缓存
    if (userName) {
      keysToDelete.push(`user:username:${userName}`);
      keysToDelete.push(`user:exists:${userName}`);
    }

    // 清理用户ID相关的缓存
    if (userId) {
      keysToDelete.push(`user:id:${userId}`);
    }

    // 批量删除缓存
    for (const key of keysToDelete) {
      await this.cacheService.delete(key);
    }

    this.logger.debug(`清理用户缓存: ${keysToDelete.join(', ')}`);
  }
}