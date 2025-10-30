import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AlbumService } from './album.service';
import { Album } from './entities/album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('相册管理（需认证）')
@Controller('albums')
@UseGuards(TokenGuard)
@ApiBearerAuth()
export class ProtectedAlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新增相册' })
  @ApiBody({ type: CreateAlbumDto })
  @ApiResponse({
    status: 201,
    description: '创建成功',
    schema: {
      example: {
        code: 201,
        message: '操作成功',
        data: {
          id: '1234567890123456789',
          userId: '1234567890123456788',
          albumName: '我的相册',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/albums',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async create(@Body() createAlbumDto: CreateAlbumDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const album = await this.albumService.create(createAlbumDto, userId);
    return {
      code: 201,
      message: '创建成功',
      data: album,
      timestamp: new Date().toISOString(),
      path: '/api/albums',
    };
  }

  @Get()
  @ApiOperation({ summary: '分页查询相册' })
  @ApiQuery({ type: QueryAlbumDto })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        code: 200,
        message: '查询成功',
        data: {
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
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/albums',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async findAll(@Query() queryDto: QueryAlbumDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const result = await this.albumService.findByUserId(userId, queryDto);

    return {
      code: 200,
      message: '查询成功',
      data: result,
      timestamp: new Date().toISOString(),
      path: '/api/albums',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取相册详情' })
  @ApiParam({ name: 'id', description: '相册ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        code: 200,
        message: '查询成功',
        data: {
          id: '1234567890123456789',
          userId: '1234567890123456788',
          albumName: '我的相册',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/albums/1234567890123456789',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '相册不存在',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const album = await this.albumService.findByIdAndUserId(id, userId);

    if (!album) {
      return {
        code: 404,
        message: '相册不存在',
        data: null,
        timestamp: new Date().toISOString(),
        path: `/api/albums/${id}`,
      };
    }

    return {
      code: 200,
      message: '查询成功',
      data: album,
      timestamp: new Date().toISOString(),
      path: `/api/albums/${id}`,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改相册名称' })
  @ApiParam({ name: 'id', description: '相册ID' })
  @ApiBody({ type: UpdateAlbumDto })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        code: 200,
        message: '更新成功',
        data: {
          id: '1234567890123456789',
          userId: '1234567890123456788',
          albumName: '更新后的相册名称',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/albums/1234567890123456789',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '相册不存在',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAlbumDto: UpdateAlbumDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;

    try {
      const album = await this.albumService.update(id, userId, updateAlbumDto);
      return {
        code: 200,
        message: '更新成功',
        data: album,
        timestamp: new Date().toISOString(),
        path: `/api/albums/${id}`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          code: 404,
          message: error.message,
          data: null,
          timestamp: new Date().toISOString(),
          path: `/api/albums/${id}`,
        };
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除相册' })
  @ApiParam({ name: 'id', description: '相册ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        message: '删除成功',
        data: null,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/albums/1234567890123456789',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '相册不存在',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;

    try {
      await this.albumService.delete(id, userId);
      return {
        code: 200,
        message: '删除成功',
        data: null,
        timestamp: new Date().toISOString(),
        path: `/api/albums/${id}`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          code: 404,
          message: error.message,
          data: null,
          timestamp: new Date().toISOString(),
          path: `/api/albums/${id}`,
        };
      }
      throw error;
    }
  }
}