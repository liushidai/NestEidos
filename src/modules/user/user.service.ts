import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
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

  // ========== 管理员功能方法 ==========

  /**
   * 分页获取用户列表（管理员功能）
   */
  async findUsersWithPagination(query: UserQueryDto): Promise<{
    users: UserProfileDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      this.logger.debug(`分页查询用户列表: ${JSON.stringify(query)}`);

      const result = await this.userRepository.findUsersWithPagination(query);

      // 转换为安全的用户信息（不包含密码）
      const users = result.users.map((user) => UserProfileDto.fromUser(user));

      return {
        ...result,
        users,
      };
    } catch (error) {
      this.logger.error('分页查询用户列表失败', error.stack);
      throw error;
    }
  }

  /**
   * 根据ID获取用户详细信息（管理员功能）
   */
  async getUserDetailById(id: string): Promise<UserProfileDto | null> {
    try {
      this.logger.debug(`管理员查询用户详情: ${id}`);
      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      return UserProfileDto.fromUser(user);
    } catch (error) {
      this.logger.error(`管理员查询用户详情失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 切换用户状态（管理员功能）
   */
  async toggleUserStatus(
    id: string,
    toggleUserStatusDto: ToggleUserStatusDto,
  ): Promise<UserProfileDto> {
    try {
      this.logger.debug(
        `切换用户状态: ${id} -> ${toggleUserStatusDto.userStatus}`,
      );

      const user = await this.userRepository.toggleUserStatus(
        id,
        toggleUserStatusDto.userStatus,
      );

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      this.logger.log(
        `用户状态切换成功: ${user.userName} -> ${toggleUserStatusDto.userStatus}`,
      );

      return UserProfileDto.fromUser(user);
    } catch (error) {
      this.logger.error(`切换用户状态失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 重置用户密码（管理员功能）
   */
  async resetUserPassword(
    id: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string; newPassword?: string }> {
    try {
      this.logger.debug(`重置用户密码: ${id}`);

      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      let newPassword: string;

      if (resetPasswordDto.useDefaultPassword) {
        // 使用默认密码
        newPassword = 'TempPassword123!';
        this.logger.warn(`为用户 ${user.userName} 使用默认密码重置密码`);
      } else if (resetPasswordDto.newPassword) {
        // 使用指定的新密码
        newPassword = resetPasswordDto.newPassword;
      } else {
        throw new BadRequestException('必须提供新密码或使用默认密码选项');
      }

      // 加密新密码
      const bcryptRounds =
        this.configService.get<number>('auth.security.bcryptRounds') || 10;
      const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);

      // 更新密码
      await this.userRepository.resetPassword(id, hashedPassword);

      this.logger.log(`用户密码重置成功: ${user.userName}`);

      return {
        success: true,
        message: '密码重置成功',
        newPassword: resetPasswordDto.useDefaultPassword
          ? newPassword
          : undefined, // 只有使用默认密码时才返回密码
      };
    } catch (error) {
      this.logger.error(`重置用户密码失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查用户是否存在（管理员功能）
   */
  async userExists(id: string): Promise<boolean> {
    try {
      this.logger.debug(`检查用户是否存在: ${id}`);
      return await this.userRepository.exists(id);
    } catch (error) {
      this.logger.error(`检查用户是否存在失败: ${id}`, error.stack);
      return false;
    }
  }
}
