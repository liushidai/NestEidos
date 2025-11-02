import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';
import { CacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils } from '../../../cache';
import { UserQueryDto } from '../dto/user-query.dto';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 根据ID查找用户（带缓存）
   */
  async findById(id: string): Promise<User | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);

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
      const cacheKey = CacheKeyUtils.buildRepositoryKey('user', 'username', userName);

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
        const usernameCacheKey = CacheKeyUtils.buildRepositoryKey('user', 'username', savedUser.userName);
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

  /**
   * 更新用户信息
   */
  async update(id: string, updateData: Partial<User>): Promise<User> {
    try {
      // 先获取原始用户数据用于缓存清理
      const originalUser = await this.findById(id);

      // 更新用户
      await this.userRepository.update(id, updateData);

      // 获取更新后的用户数据
      const updatedUser = await this.findById(id);

      if (!updatedUser) {
        throw new Error('更新用户失败：用户不存在');
      }

      // 清理相关缓存
      const idCacheKey = CacheKeyUtils.buildRepositoryKey('user', 'id', id);
      await this.cacheService.delete(idCacheKey);

      if (updatedUser.userName) {
        const usernameCacheKey = CacheKeyUtils.buildRepositoryKey('user', 'username', updatedUser.userName);
        await this.cacheService.delete(usernameCacheKey);
      }

      this.logger.log(`更新用户成功: ${updatedUser.userName}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`更新用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 分页查询用户列表
   */
  async findUsersWithPagination(query: UserQueryDto): Promise<{ users: User[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const { page, limit, userName, userType, userStatus } = query;
      const skip = (page - 1) * limit;

      // 构建查询
      let queryBuilder: SelectQueryBuilder<User> = this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.userName', 'user.userType', 'user.userStatus', 'user.createdAt', 'user.updatedAt']); // 不包含密码

      // 添加筛选条件
      if (userName) {
        queryBuilder = queryBuilder.andWhere('user.userName ILIKE :userName', { userName: `%${userName}%` });
      }

      if (userType !== undefined) {
        queryBuilder = queryBuilder.andWhere('user.userType = :userType', { userType });
      }

      if (userStatus !== undefined) {
        queryBuilder = queryBuilder.andWhere('user.userStatus = :userStatus', { userStatus });
      }

      // 获取总数
      const total = await queryBuilder.getCount();

      // 获取分页数据
      const users = await queryBuilder
        .orderBy('user.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      const totalPages = Math.ceil(total / limit);

      this.logger.debug(`分页查询用户: page=${page}, limit=${limit}, total=${total}`);

      return {
        users,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('分页查询用户失败', error.stack);
      throw error;
    }
  }

  /**
   * 切换用户状态
   */
  async toggleUserStatus(id: string, userStatus: number): Promise<User> {
    try {
      const user = await this.findById(id);

      if (!user) {
        throw new Error('用户不存在');
      }

      // 不允许用户禁用自己
      if (user.userStatus === userStatus) {
        return user; // 状态未改变，直接返回
      }

      return await this.update(id, { userStatus });
    } catch (error) {
      this.logger.error(`切换用户状态失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 重置用户密码
   */
  async resetPassword(id: string, newPassword: string): Promise<User> {
    try {
      const user = await this.findById(id);

      if (!user) {
        throw new Error('用户不存在');
      }

      return await this.update(id, { passWord: newPassword });
    } catch (error) {
      this.logger.error(`重置用户密码失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查用户是否存在
   */
  async exists(id: string): Promise<boolean> {
    try {
      const user = await this.findById(id);
      return user !== null;
    } catch (error) {
      this.logger.error(`检查用户是否存在失败: ${id}`, error.stack);
      return false;
    }
  }
}