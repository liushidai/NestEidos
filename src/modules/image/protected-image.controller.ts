import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ImageService } from './image.service';
import { UpdateImageDto } from './dto/update-image.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('图片管理（需认证）')
@Controller('image')
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
export class ProtectedImageController {
  constructor(private readonly imageService: ImageService) {}

  @Get(':id')
  @ApiOperation({ summary: '获取图片详情' })
  @ApiParam({ name: 'id', description: '图片ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
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
    },
  })
  @ApiResponse({
    status: 404,
    description: '图片不存在',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const image = await this.imageService.findByIdAndUserId(id, userId);
    if (!image) {
      throw new NotFoundException('图片不存在或无权限操作');
    }
    return image;
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改图片标题' })
  @ApiParam({ name: 'id', description: '图片ID' })
  @ApiBody({ type: UpdateImageDto })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        id: '1234567890123456789',
        userId: '1234567890123456788',
        albumId: '1234567890123456789',
        originalName: 'photo.jpg',
        title: '更新后的图片标题',
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
    },
  })
  @ApiResponse({
    status: 404,
    description: '图片不存在',
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
    @Body() updateImageDto: UpdateImageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.imageService.update(id, userId, updateImageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除图片' })
  @ApiParam({ name: 'id', description: '图片ID' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: null,
    },
  })
  @ApiResponse({
    status: 404,
    description: '图片不存在',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    await this.imageService.delete(id, userId);
  }
}
