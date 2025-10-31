import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 根据ID查找用户
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findById(id: string): Promise<User | null> {
    this.logger.debug(`查找用户: ${id}`);
    return await this.userRepository.findById(id);
  }

  /**
   * 更新用户
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.debug(`更新用户: ${id}`);
    const { updatedUser } = await this.userRepository.update(id, userData);
    return updatedUser;
  }

  /**
   * 创建用户
   * 委托给Repository处理
   */
  async create(userData: Partial<User>): Promise<User> {
    this.logger.debug(`创建用户: ${userData.userName}`);
    return await this.userRepository.create(userData);
  }

  /**
   * 删除用户
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async delete(id: string): Promise<{ deleted: boolean; userName?: string }> {
    this.logger.debug(`删除用户: ${id}`);

    // 先获取用户信息用于返回
    const user = await this.userRepository.findById(id);

    // 删除用户
    await this.userRepository.delete(id);

    return {
      deleted: true,
      userName: user?.userName
    };
  }
}