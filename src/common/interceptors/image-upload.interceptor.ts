import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { createDefaultImageFileFilter } from '../filters/imageFileFilter';

/**
 * 图片上传拦截器
 * 动态配置文件大小限制和文件过滤器
 */
@Injectable()
export class ImageUploadInterceptor implements NestInterceptor {
  private readonly fileInterceptor: any;

  constructor(private configService: ConfigService) {
    // 从配置服务获取最大文件大小，默认 100MB
    const maxFileSize = this.configService.get<number>(
      'upload.maxFileSize',
      100 * 1024 * 1024,
    );

    // 创建 FileInterceptor 实例
    this.fileInterceptor = FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: maxFileSize,
      },
      fileFilter: createDefaultImageFileFilter(maxFileSize, true),
    });
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    // 委托给 FileInterceptor 处理
    return this.fileInterceptor.intercept(context, next);
  }
}