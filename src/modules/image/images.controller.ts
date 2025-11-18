import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
  @ApiQuery({
    name: 'page',
    required: false,
    type: String,
    description: '页码，从1开始',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: '每页数量',
    example: '10',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: '图片标题模糊搜索',
    example: '猫咪',
  })
  @ApiQuery({
    name: 'albumId',
    required: false,
    type: String,
    description: '相册ID筛选',
    example: '1234567890123456789',
  })
  @ApiQuery({
    name: 'mimeType',
    required: false,
    type: [String],
    description: '图片类型筛选（可重复）',
    example: ['image/jpeg', 'image/png'],
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        items: [
          {
            id: '1234567890123456789',
            userId: '1234567890123456788',
            albumId: '1234567890123456789',
            originalName: 'photo.jpg',
            title: '一只可爱的猫咪',
            imageHash:
              'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
            imageSize: 1024000,
            imageMimeType: 'image/jpeg',
            imageWidth: 1920,
            imageHeight: 1080,
            originalKey: 'originals/1234567890123456790.jpg',
            jpegKey: 'processed/1234567890123456790.jpg',
            webpKey: 'processed/1234567890123456790.webp',
            avifKey: 'processed/1234567890123456790.avif',
            hasTransparency: false,
            isAnimated: false,
            secureUrl:
              'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
            hasJpeg: true,
            hasWebp: true,
            hasAvif: true,
            convertJpegParam: {},
            convertWebpParam: {},
            convertAvifParam: {},
            defaultFormat: 'avif',
            expirePolicy: 1,
            expiresAt: '2024-12-31T23:59:59.000Z',
            nsfwScore: null,
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
    @Query() queryDto: QueryImageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    const result = await this.imageService.findByUserId(userId, queryDto);
    return result;
  }
}
