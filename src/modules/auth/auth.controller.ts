import { Controller, Post, Body, Get, UseGuards, Request, Headers, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { User } from '../user/entities/user.entity';
import { TokenGuard } from './guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('认证管理')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    schema: {
      example: {
        code: 201,
        message: '操作成功',
        data: {
          id: '1234567890123456789',
          userName: 'testuser',
          userType: 10,
          userStatus: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/auth/register',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '用户名已存在',
  })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    const user = await this.authService.register(registerUserDto);
    // 不返回密码
    const { passWord, ...userInfo } = user;
    return userInfo as User;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      example: {
        code: 200,
        message: '操作成功',
        data: {
          token: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          expires_in: 3600,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/auth/login',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '用户名或密码错误',
  })
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户注销' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '注销成功',
    schema: {
      example: {
        code: 200,
        message: '操作成功',
        data: null,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/auth/logout',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  @UseGuards(TokenGuard)
  async logout(
    @Request() req: AuthenticatedRequest,
    @Headers('authorization') authHeader?: string,
  ): Promise<void> {
    let token: string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      throw new UnauthorizedException('未提供有效的认证令牌');
    }

    await this.authService.logout(token);
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        message: '查询成功',
        data: {
          userId: '1234567890123456789',
          userName: 'testuser',
          userType: 10,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/auth/profile',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  @UseGuards(TokenGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
}