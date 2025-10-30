import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('用户管理（需认证）')
@Controller('users')
@UseGuards(TokenGuard)
@ApiBearerAuth()
export class ProtectedUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '获取所有用户信息（需要认证）' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [User],
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户的详细信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        message: '查询成功',
        data: {
          id: '1234567890123456789',
          userName: 'testuser',
          userType: 10,
          userStatus: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/profile',
      },
    },
  })
  async getCurrentUserProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.userService.findById(userId);
  }

  @Get('check-auth')
  @ApiOperation({ summary: '检查认证状态' })
  @ApiResponse({
    status: 200,
    description: '认证有效',
    schema: {
      example: {
        code: 200,
        message: '查询成功',
        data: {
          authenticated: true,
          user: {
            userId: '1234567890123456789',
            userName: 'testuser',
            userType: 10,
          },
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/check-auth',
      },
    },
  })
  async checkAuth(@Request() req: AuthenticatedRequest) {
    return {
      authenticated: true,
      user: req.user,
    };
  }
}