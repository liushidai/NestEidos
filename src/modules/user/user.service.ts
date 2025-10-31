import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * 根据用户名查找用户
   */
  async findByUserName(userName: string): Promise<User | null> {
    return this.userRepository.findByUserName(userName);
  }

  /**
   * 创建用户
   */
  async create(userData: Partial<User>): Promise<User> {
    return this.userRepository.create(userData);
  }

  /**
   * 更新用户
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    return this.userRepository.update(id, userData);
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    return this.userRepository.delete(id);
  }

  /**
   * 检查用户名是否存在
   */
  async existsByUserName(userName: string): Promise<boolean> {
    return this.userRepository.existsByUserName(userName);
  }
}