import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
      throw new BadRequestException('用户名已存在');
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(registerUserDto.passWord, 10);

    // 创建用户
    const user = this.userRepository.create({
      ...registerUserDto,
      passWord: hashedPassword,
    });

    // 保存用户，时间戳会自动处理
    return this.userRepository.save(user);
  }

  /**
   * 用户登录
   */
  async login(loginUserDto: LoginUserDto): Promise<User> {
    // 查找用户
    const user = await this.userRepository.findOneBy({
      userName: loginUserDto.userName,
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态 - 为了安全，也返回相同的错误信息
    if (user.userStatus !== 1) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginUserDto.passWord, user.passWord);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 返回用户信息（不包含密码）
    const { passWord, ...userInfo } = user;
    return userInfo as User;
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  /**
   * 根据用户名查找用户
   */
  async findByUserName(userName: string): Promise<User | null> {
    return this.userRepository.findOneBy({ userName });
  }

  /**
   * 获取所有用户
   */
  async findAll(): Promise<User[]> {
    // 不返回密码
    const users = await this.userRepository.find();
    return users.map(user => {
      const { passWord, ...userInfo } = user;
      return userInfo as User;
    });
  }
}