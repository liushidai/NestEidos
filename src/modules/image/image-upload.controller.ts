import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('图片上传（需认证）')
@Controller('image')
@UseGuards(TokenGuard)
@ApiBearerAuth()
export class ImageUploadController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传图片文件，可选择指定相册ID和标题',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: 201,
    description: '上传成功',
    schema: {
      example: {
        id: '1234567890123456789',
        userId: '1234567890123456788',
        albumId: '0',
        originalName: 'test1.jpg',
        title: '一只猫',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        originalKey: 'images/2024/01/01/1234567890123456789.jpg',
        webpKey: null,
        avifKey: null,
        hasWebp: false,
        hasAvif: false,
        convertWebpParamId: null,
        convertAvifParamId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误或文件格式不支持',
  })
  @ApiResponse({
    status: 401,
    description: '认证令牌无效或已过期',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() createImageDto: CreateImageDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Image> {
    // 验证文件是否存在
    if (!file) {
      throw new BadRequestException('请选择要上传的图片文件');
    }

    // 验证文件类型（暂时只允许图片格式）
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
    }

    // 验证文件大小（暂时限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过10MB');
    }

    const userId = req.user.userId;

    // 暂时不实现实际的图片处理逻辑，只保存基本记录
    // TODO: 后续实现实际的图片处理逻辑：
    // 1. 文件类型验证
    // 2. 图片尺寸获取
    // 3. 文件哈希计算
    // 4. 文件存储到对象存储
    // 5. 生成缩略图和格式转换

    const result = await this.imageService.create(createImageDto, userId, file);

    return result;
  }
}