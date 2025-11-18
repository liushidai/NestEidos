import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../user/repositories/user.repository';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminInitService implements OnModuleInit {
  private readonly logger = new Logger(AdminInitService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUser();
  }

  /**
   * 确保管理员用户存在
   */
  private async ensureAdminUser(): Promise<void> {
    try {
      // 检查 admin 用户是否已存在
      const existingAdmin = await this.userRepository.findByUserName('admin');

      if (existingAdmin) {
        this.logger.log('管理员用户已存在，跳过初始化');
        return;
      }

      // 获取管理员密码配置
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

      if (!adminPassword || adminPassword.trim() === '') {
        this.logger.error(
          '管理员密码未配置！请在 .env 文件中设置 ADMIN_PASSWORD',
        );
        this.logger.error(
          '为安全起见，应用将停止启动。请配置管理员密码后重试。',
        );
        process.exit(1);
      }

      // 验证密码强度
      if (adminPassword.length < 8) {
        this.logger.error('管理员密码长度不足！密码长度至少需要8个字符');
        this.logger.error(
          '为安全起见，应用将停止启动。请设置更强的管理员密码后重试。',
        );
        process.exit(1);
      }

      // 创建管理员用户
      await this.createAdminUser(adminPassword);
    } catch (error) {
      this.logger.error('初始化管理员用户时发生错误:', error.message);
      this.logger.error('应用将停止启动。请检查数据库连接和配置后重试。');
      process.exit(1);
    }
  }

  /**
   * 创建管理员用户
   */
  private async createAdminUser(password: string): Promise<User> {
    this.logger.log('开始创建管理员用户...');

    // 加密密码（使用更高的加密轮数以确保安全性）
    const bcryptRounds =
      this.configService.get<number>('auth.security.bcryptRounds') || 12;
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    // 直接通过 UserRepository 创建用户数据，绕过注册接口的限制
    const adminUserData = {
      userName: 'admin',
      passWord: hashedPassword,
      userType: 1, // 管理员类型
      userStatus: 1, // 正常状态
    };

    const adminUser = await this.userRepository.create(adminUserData);

    this.logger.log('管理员用户创建成功！');
    this.logger.warn('安全提醒：请尽快修改默认管理员密码以确保系统安全');

    return adminUser;
  }
}
