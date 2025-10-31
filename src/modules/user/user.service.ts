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
}