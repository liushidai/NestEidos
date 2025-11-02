import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('用户管理（需认证）')
@Controller('user')
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
export class ProtectedUserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户的详细信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
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
  async getCurrentUserProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.userService.getUserProfile(userId);
  }

  @Get('check-auth')
  @ApiOperation({ summary: '检查认证状态' })
  @ApiResponse({
    status: 200,
    description: '认证有效',
    schema: {
      example: {
        authenticated: true,
        user: {
          userId: '1234567890123456789',
          userName: 'testuser',
          userType: 10,
        },
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