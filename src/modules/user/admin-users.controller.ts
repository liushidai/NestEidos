import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserQueryDto } from './dto/user-query.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('管理员用户管理')
@Controller('admin/users')
@UseGuards(TokenGuard, AdminGuard)
@ApiBearerAuth('token')
export class AdminUsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: '分页获取用户列表',
    description: '管理员可以分页查询所有用户，支持用户名模糊搜索和状态筛选'
  })
  @ApiQuery({ name: 'page', description: '页码', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', description: '每页数量', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'userName', description: '用户名模糊搜索', required: false, type: String, example: 'admin' })
  @ApiQuery({ name: 'userType', description: '用户类型筛选', required: false, type: Number, enum: [1, 10], example: 10 })
  @ApiQuery({ name: 'userStatus', description: '用户状态筛选', required: false, type: Number, enum: [0, 1], example: 1 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        users: [
          {
            id: '1234567890123456789',
            userName: 'admin',
            userType: 1,
            userStatus: 1,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '认证失败或权限不足',
  })
  async findUsersWithPagination(@Query() query: UserQueryDto) {
    return this.userService.findUsersWithPagination(query);
  }
}