import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { SimpleCacheService } from '@/common/cache';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
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

      // 缓存结果（1小时）
      if (user) {
        await this.cacheService.set(cacheKey, user, 3600);
      }

      return user;
    } catch (error) {
      this.logger.error(`根据ID查找用户失败: ${id}`, error.stack);
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

  /**
   * 更新用户（使用事务确保一致性，返回更新前和更新后的用户信息）
   * 更新后自动清理相关缓存
   */
  async update(id: string, userData: Partial<User>): Promise<{ oldUser: User | null; updatedUser: User }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 在事务中先获取更新前的用户信息（使用悲观锁防止并发修改）
      const oldUser = await queryRunner.manager.findOne(User, {
        where: { id },
        // 使用悲观锁，防止其他事务在此期间修改
        lock: { mode: 'pessimistic_write' }
      });

      // 执行更新操作
      await queryRunner.manager.update(User, id, userData);

      // 在同一事务中获取更新后的用户信息
      const updatedUser = await queryRunner.manager.findOneBy(User, { id });
      if (!updatedUser) {
        throw new Error(`更新后找不到用户: ${id}`);
      }

      // 提交事务
      await queryRunner.commitTransaction();

      // 清理相关缓存
      await this.clearUserCache(id);

      this.logger.log(`更新用户成功: ${id}`);
      return { oldUser, updatedUser };
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      this.logger.error(`更新用户失败: ${id}`, error.stack);
      throw error;
    } finally {
      // 释放连接
      await queryRunner.release();
    }
  }

  /**
   * 删除用户（删除后自动清理相关缓存）
   */
  async delete(id: string): Promise<void> {
    try {
      const result = await this.userRepository.delete(id);
      if (result.affected === 0) {
        throw new Error(`删除用户失败，用户不存在: ${id}`);
      }

      // 清理相关缓存
      await this.clearUserCache(id);

      this.logger.log(`删除用户成功: ${id}`);
    } catch (error) {
      this.logger.error(`删除用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 清理用户相关缓存
   * @param userId 用户ID
   */
  private async clearUserCache(userId: string): Promise<void> {
    try {
      const cacheKey = `user:id:${userId}`;
      await this.cacheService.delete(cacheKey);
      this.logger.debug(`清理用户缓存: ${userId}`);
    } catch (error) {
      this.logger.warn(`清理用户缓存失败: ${userId}`, error.message);
    }
  }
}