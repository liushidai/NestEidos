import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ImageService } from './image.service';
import { QueryImageDto } from './dto/query-image.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('图片管理（需认证）')
@Controller('images')
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
export class ImagesController {
  constructor(private readonly imageService: ImageService) {}

  @Get()
  @ApiOperation({ summary: '分页查询图片' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码，从1开始', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: '图片标题模糊搜索', example: '猫咪' })
  @ApiQuery({ name: 'albumId', required: false, type: String, description: '相册ID筛选', example: '1234567890123456789' })
  @ApiQuery({ name: 'mimeType', required: false, type: String, description: '图片类型筛选（可重复）', example: 'image/jpeg' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        images: [
          {
            id: '1234567890123456789',
            userId: '1234567890123456788',
            albumId: '1234567890123456789',
            originalName: 'photo.jpg',
            title: '一只可爱的猫咪',
            fileId: '1234567890123456790',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            file: {
              id: '1234567890123456790',
              hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
              fileSize: 1024000,
              mimeType: 'image/jpeg',
              width: 1920,
              height: 1080,
              originalKey: 'images/2024/01/01/1234567890123456790.jpg',
              webpKey: 'images/2024/01/01/1234567890123456790.webp',
              avifKey: 'images/2024/01/01/1234567890123456790.avif',
              hasWebp: true,
              hasAvif: true,
              convertWebpParamId: null,
              convertAvifParamId: null,
              createdAt: '2024-01-01T00:00:00.000Z',
            },
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
  async findAll(@Query() queryDto: QueryImageDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const result = await this.imageService.findByUserId(userId, queryDto);
    return result;
  }
}