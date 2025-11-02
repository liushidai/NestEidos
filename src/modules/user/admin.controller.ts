import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserQueryDto } from './dto/user-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('管理员用户管理')
@Controller('admin/user')
@UseGuards(TokenGuard, AdminGuard)
@ApiBearerAuth('token')
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({
    summary: '根据ID获取用户详细信息',
    description: '管理员可以查看任意用户的详细信息（不包含密码）'
  })
  @ApiParam({ name: 'id', description: '用户ID', example: '1234567890123456789' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        id: '1234567890123456789',
        userName: 'admin',
        userType: 1,
        userStatus: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
  })
  @ApiResponse({
    status: 401,
    description: '认证失败或权限不足',
  })
  async getUserDetailById(@Param('id') id: string) {
    return this.userService.getUserDetailById(id);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '切换用户状态',
    description: '管理员可以启用或禁用用户账户'
  })
  @ApiParam({ name: 'id', description: '用户ID', example: '1234567890123456789' })
  @ApiBody({ type: ToggleUserStatusDto })
  @ApiResponse({
    status: 200,
    description: '状态切换成功',
    schema: {
      example: {
        id: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
        userStatus: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
  })
  @ApiResponse({
    status: 401,
    description: '认证失败或权限不足',
  })
  async toggleUserStatus(
    @Param('id') id: string,
    @Body() toggleUserStatusDto: ToggleUserStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // 防止管理员修改自己的状态
    if (req.user && req.user.userId === id) {
      throw new BadRequestException('不能修改自己的账户状态');
    }

    return this.userService.toggleUserStatus(id, toggleUserStatusDto);
  }

  @Put(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重置用户密码',
    description: '管理员可以重置任意用户的密码，支持指定新密码或使用默认密码'
  })
  @ApiParam({ name: 'id', description: '用户ID', example: '1234567890123456789' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: '密码重置成功',
    schema: {
      examples: {
        defaultPassword: {
          summary: '使用默认密码重置',
          value: {
            success: true,
            message: '密码重置成功',
            newPassword: 'TempPassword123!',
          },
        },
        customPassword: {
          summary: '使用自定义密码重置',
          value: {
            success: true,
            message: '密码重置成功',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '认证失败或权限不足',
  })
  async resetUserPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // 防止管理员重置自己的密码
    if (req.user && req.user.userId === id) {
      throw new BadRequestException('不能重置自己的密码，请使用修改密码功能');
    }

    return this.userService.resetUserPassword(id, resetPasswordDto);
  }

  @Get(':id/exists')
  @ApiOperation({
    summary: '检查用户是否存在',
    description: '管理员可以检查指定ID的用户是否存在'
  })
  @ApiParam({ name: 'id', description: '用户ID', example: '1234567890123456789' })
  @ApiResponse({
    status: 200,
    description: '检查完成',
    schema: {
      example: {
        exists: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '认证失败或权限不足',
  })
  async checkUserExists(@Param('id') id: string) {
    const exists = await this.userService.userExists(id);
    return { exists };
  }
}