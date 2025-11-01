import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserProfileDto } from './dto/user-profile.dto';

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
   * 获取用户安全信息（不包含密码）
   */
  async getUserProfile(id: string): Promise<UserProfileDto | null> {
    this.logger.debug(`获取用户资料: ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      return null;
    }
    return UserProfileDto.fromUser(user);
  }
}