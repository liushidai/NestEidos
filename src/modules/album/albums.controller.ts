import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AlbumService } from './album.service';
import { QueryAlbumDto } from './dto/query-album.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('相册管理（需认证）')
@Controller('albums')
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
export class AlbumsController {
  constructor(private readonly albumService: AlbumService) {}

  @Get()
  @ApiOperation({ summary: '分页查询相册' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码，从1开始',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: '相册名称模糊搜索',
    example: '我的',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        albums: [
          {
            id: '1234567890123456789',
            userId: '1234567890123456788',
            albumName: '我的相册',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
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
    description: '认证令牌无效或已过期',
  })
  async findAll(
    @Query() queryDto: QueryAlbumDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    const result = await this.albumService.findByUserId(userId, queryDto);
    return result;
  }
}
