import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';

@ApiTags('用户管理')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    schema: {
      example: {
        id: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
        userStatus: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '注册失败（用户名已存在或参数错误）',
  })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    const user = await this.userService.register(registerUserDto);
    // 不返回密码
    const { passWord, ...userInfo } = user;
    return userInfo as User;
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      example: {
        id: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
        userStatus: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '登录失败（用户名或密码错误，或账号被封禁）',
  })
  async login(@Body() loginUserDto: LoginUserDto): Promise<User> {
    return this.userService.login(loginUserDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有用户' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [User],
  })
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }
}