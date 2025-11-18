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
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: any;
}

@ApiTags('图片上传（需认证）')
@Controller('image')
@UseGuards(TokenGuard)
@ApiBearerAuth('token')
export class ImageUploadController {
  constructor(
    private readonly imageService: ImageService,
    private readonly configService: ConfigService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ImageUploadInterceptor)
  @ApiOperation({ summary: '上传图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      '上传图片文件，可选择指定相册ID、标题、默认格式、质量参数和过期策略',
    type: UploadImageDto,
  })
  @ApiResponse({
    status: 201,
    description: '上传成功',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: '1234567890123456789',
          description: '图片ID',
        },
        userId: {
          type: 'string',
          example: '1234567890123456788',
          description: '用户ID',
        },
        albumId: { type: 'string', example: '0', description: '相册ID' },
        originalName: {
          type: 'string',
          example: '测试图片.jpg',
          description: '原始文件名（支持中文，超长会自动截断）',
        },
        title: { type: 'string', example: '一只猫', description: '图片标题' },
        imageHash: {
          type: 'string',
          example:
            'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          description: '图片哈希',
        },
        imageSize: {
          type: 'number',
          example: 1024000,
          description: '文件大小（字节）',
        },
        imageMimeType: {
          type: 'string',
          example: 'image/jpeg',
          description: 'MIME类型',
        },
        imageWidth: { type: 'number', example: 1920, description: '图片宽度' },
        imageHeight: { type: 'number', example: 1080, description: '图片高度' },
        originalKey: {
          type: 'string',
          example: 'originals/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5.jpg',
          description: '原图存储路径',
        },
        jpegKey: {
          type: 'string',
          example: 'processed/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5.jpg',
          description: 'JPEG存储路径',
        },
        webpKey: {
          type: 'string',
          example: 'processed/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5.webp',
          description: 'WebP存储路径',
        },
        avifKey: {
          type: 'string',
          example: 'processed/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5.avif',
          description: 'AVIF存储路径',
        },
        hasTransparency: {
          type: 'boolean',
          example: false,
          description: '是否有透明通道',
        },
        isAnimated: {
          type: 'boolean',
          example: false,
          description: '是否为动画',
        },
        secureUrl: {
          type: 'string',
          example:
            'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
          description: '图片的安全URL',
        },
        hasJpeg: {
          type: 'boolean',
          example: true,
          description: '是否已生成JPEG',
        },
        hasWebp: {
          type: 'boolean',
          example: true,
          description: '是否已生成WebP',
        },
        hasAvif: {
          type: 'boolean',
          example: true,
          description: '是否已生成AVIF',
        },
        convertJpegParam: {
          type: 'object',
          example: {},
          description: 'JPEG转换参数',
        },
        convertWebpParam: {
          type: 'object',
          example: {},
          description: 'WebP转换参数',
        },
        convertAvifParam: {
          type: 'object',
          example: {},
          description: 'AVIF转换参数',
        },
        defaultFormat: {
          type: 'string',
          example: 'avif',
          enum: ['original', 'jpeg', 'webp', 'avif'],
          description: '默认格式',
        },
        expirePolicy: {
          type: 'number',
          example: 1,
          enum: [1, 2, 3],
          description: '过期策略',
        },
        expiresAt: {
          type: 'string',
          example: '2024-12-31T23:59:59.000Z',
          description: '过期时间',
        },
        nsfwScore: { type: 'number', example: null, description: 'NSFW分数' },
        createdAt: {
          type: 'string',
          example: '2024-01-01T00:00:00.000Z',
          description: '创建时间',
        },
        updatedAt: {
          type: 'string',
          example: '2024-01-01T00:00:00.000Z',
          description: '更新时间',
        },
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
    @UploadedFile() // 文件验证已在 fileFilter 中完成，无需额外管道
    file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Image> {
    const userId = req.user.userId;

    // 处理文件名：修复中文编码并截断超长部分
    if (file && file.originalname) {
      file.originalname = ImageUploadInterceptor.processFileName(
        file.originalname,
      );
    }

    // 将 UploadImageDto 转换为 CreateImageDto 以兼容服务层
    const createImageDto: CreateImageDto = {
      title: uploadImageDto.title,
      albumId: uploadImageDto.albumId,
      format: uploadImageDto.defaultFormat,
      expirePolicy: uploadImageDto.expirePolicy,
      expiresAt: uploadImageDto.expiresAt,
      quality: uploadImageDto.quality,
    };

    // fileFilter 已确保文件合法，无需重复验证
    // 直接进行业务处理：完整的图片处理逻辑已在服务层实现
    const result = await this.imageService.create(createImageDto, userId, file);

    return result;
  }
}
