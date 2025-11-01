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
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { TokenGuard } from '../auth/guards/token.guard';
import { FileValidationPipe } from '../../pipes/file-validation.pipe';
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
          originalKey: 'images/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5-o.jpg',
          webpKey: 'images/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5-w.webp',
          avifKey: 'images/A1b2C3dE4f5G6h7I8j9K0l1M2n3O4P5-a.avif',
          hasWebp: true,
          hasAvif: true,
          convertWebpParamId: null,
          convertAvifParamId: null,
          createdAt: '2024-01-01T00:00:00.000Z',
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
    @UploadedFile(FileValidationPipe.createImagePipe()) // 文件验证已在 fileFilter 中完成
    file: Express.Multer.File,
    @Body() createImageDto: CreateImageDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Image> {
    const userId = req.user.userId;

    // fileFilter 已确保文件合法，无需重复验证
    // 直接进行业务处理：完整的图片处理逻辑已在服务层实现
    const result = await this.imageService.create(createImageDto, userId, file);

    return result;
  }
}