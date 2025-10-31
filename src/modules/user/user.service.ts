import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { Cacheable, DEFAULT_TTL_CONFIG, CacheInvalidation } from '@/common/cache';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
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
   * 创建用户（自动清理缓存）
   */
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['result.id'] },
      { methodName: 'findByUserName', paramMapping: ['result.userName'] },
      { methodName: 'existsByUserName', paramMapping: ['result.userName'] }
    ]
  })
  async create(userData: Partial<User>): Promise<User> {
    this.logger.debug(`创建用户: ${userData.userName}`);
    return await this.userRepository.create(userData);
  }

  /**
   * 更新用户（自动清理缓存）
   */
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] },
      { methodName: 'findByUserName', paramMapping: ['result.userName', 'args.1.userName'] },
      { methodName: 'existsByUserName', paramMapping: ['result.userName', 'args.1.userName'] }
    ]
  })
  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.debug(`更新用户: ${id}`);
    const { updatedUser } = await this.userRepository.update(id, userData);
    return updatedUser;
  }

  /**
   * 删除用户（自动清理缓存）
   */
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] },
      { methodName: 'findByUserName', paramMapping: ['result.userName'] },
      { methodName: 'existsByUserName', paramMapping: ['result.userName'] }
    ]
  })
  async delete(id: string): Promise<{ deleted: boolean; userName?: string }> {
    this.logger.debug(`删除用户: ${id}`);

    // 获取用户信息用于后续缓存清理
    const user = await this.userRepository.findById(id);
    await this.userRepository.delete(id);

    // 返回删除结果和用户信息供拦截器使用
    return {
      deleted: true,
      userName: user?.userName
    };
  }
}