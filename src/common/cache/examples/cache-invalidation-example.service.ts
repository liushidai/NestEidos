import { Injectable, Logger } from '@nestjs/common';
import { Cacheable, DEFAULT_TTL_CONFIG, CacheInvalidation } from '../index';

// 模拟数据
interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class CacheInvalidationExampleService {
  private readonly logger = new Logger(CacheInvalidationExampleService.name);
  private users: Map<string, User> = new Map();

  constructor() {
    // 初始化一些示例数据
    this.users.set('1', { id: '1', name: '张三', email: 'zhangsan@example.com' });
    this.users.set('2', { id: '2', name: '李四', email: 'lisi@example.com' });
  }

  /**
   * 根据ID查找用户（带缓存）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findById(id: string): Promise<User | null> {
    this.logger.debug(`执行数据库查询获取用户: ${id}`);
    await this.simulateDelay(100); // 模拟数据库查询延迟
    return this.users.get(id) || null;
  }

  /**
   * 根据邮箱查找用户（带缓存）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.DEFAULT })
  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`执行数据库查询获取用户: ${email}`);
    await this.simulateDelay(100);
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  /**
   * 获取所有用户（带缓存）
   */
  @Cacheable({ ttl: DEFAULT_TTL_CONFIG.SHORT })
  async findAll(): Promise<User[]> {
    this.logger.debug('执行数据库查询获取所有用户');
    await this.simulateDelay(150);
    return Array.from(this.users.values());
  }

  /**
   * 创建用户（自动清理相关缓存）
   */
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['result.id'] },
      { methodName: 'findByEmail', paramMapping: ['result.email'] },
      { methodName: 'findAll', clearAll: true } // 清理findAll的所有缓存
    ]
  })
  async create(userData: Omit<User, 'id'>): Promise<User> {
    this.logger.debug(`创建用户: ${userData.name}`);
    await this.simulateDelay(50);

    const newUser: User = {
      id: (this.users.size + 1).toString(),
      ...userData
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  /**
   * 更新用户（自动清理相关缓存）
   */
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] }, // 根据参数ID清理
      { methodName: 'findByEmail', paramMapping: ['result.email', 'args.1.email'] }, // 根据新邮箱和旧邮箱清理
      { methodName: 'findAll', clearAll: true } // 清理所有用户列表缓存
    ]
  })
  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.debug(`更新用户: ${id}`);
    await this.simulateDelay(50);

    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`用户不存在: ${id}`);
    }

    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * 删除用户（自动清理相关缓存）
   */
  @CacheInvalidation({
    entries: [
      { methodName: 'findById', paramMapping: ['args.0'] },
      { methodName: 'findByEmail', paramMapping: ['result.email'] },
      { methodName: 'findAll', clearAll: true }
    ]
  })
  async delete(id: string): Promise<{ deleted: boolean; email?: string }> {
    this.logger.debug(`删除用户: ${id}`);
    await this.simulateDelay(50);

    const user = this.users.get(id);
    const deleted = this.users.delete(id);

    return {
      deleted,
      email: user?.email
    };
  }

  /**
   * 模拟数据库查询延迟
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取当前用户数量（用于演示）
   */
  getUserCount(): number {
    return this.users.size;
  }
}