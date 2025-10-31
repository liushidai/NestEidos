import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ id });
    } catch (error) {
      this.logger.error(`根据ID查找用户失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据用户名查找用户
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

  /**
   * 更新用户
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    try {
      await this.userRepository.update(id, userData);

      const updatedUser = await this.userRepository.findOneBy({ id });
      if (!updatedUser) {
        throw new Error(`更新后找不到用户: ${id}`);
      }

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
      const result = await this.userRepository.delete(id);
      if (result.affected === 0) {
        throw new Error(`删除用户失败，用户不存在: ${id}`);
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
    try {
      const count = await this.userRepository.count({
        where: { userName },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`检查用户名是否存在失败: ${userName}`, error.stack);
      throw error;
    }
  }
}