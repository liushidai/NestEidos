import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRedis()
    private redis: Redis,
  ) {}

  /**
   * 用户注册
   */
  async register(registerUserDto: RegisterUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOneBy({
      userName: registerUserDto.userName,
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(registerUserDto.passWord, 10);

    // 创建用户
    const user = this.userRepository.create({
      ...registerUserDto,
      passWord: hashedPassword,
    });

    // 保存用户
    return this.userRepository.save(user);
  }

  /**
   * 用户登录
   */
  async login(loginUserDto: LoginUserDto): Promise<{ token: string; expires_in: number }> {
    // 查找用户
    const user = await this.userRepository.findOneBy({
      userName: loginUserDto.userName,
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.userStatus !== 1) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginUserDto.passWord, user.passWord);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 token
    const token = this.generateToken();
    const expiresIn = 3600; // 1小时

    // 存储到 Redis
    await this.redis.setex(
      `auth:token:${token}`,
      expiresIn,
      JSON.stringify({
        userId: user.id,
        userName: user.userName,
        userType: user.userType,
      }),
    );

    return {
      token,
      expires_in: expiresIn,
    };
  }

  /**
   * 验证 token
   */
  async validateToken(token: string): Promise<any> {
    const userData = await this.redis.get(`auth:token:${token}`);

    if (!userData) {
      return null;
    }

    return JSON.parse(userData);
  }

  /**
   * 注销
   */
  async logout(token: string): Promise<void> {
    await this.redis.del(`auth:token:${token}`);
  }

  /**
   * 生成高强度随机 token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 根据用户名查找用户
   */
  async findByUserName(userName: string): Promise<User | null> {
    return this.userRepository.findOneBy({ userName });
  }
}