import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { createDefaultImageFileFilter } from '../filters/imageFileFilter';

/**
 * 简化的图片上传拦截器
 *
 * 设计理念：
 * 1. 使用标准 memoryStorage，避免自定义存储的复杂性
 * 2. 统一的文件过滤器处理所有验证逻辑
 * 3. 配置驱动，支持环境变量
 * 4. 简单可靠，易于理解和维护
 */
@Injectable()
export class ImageUploadInterceptor implements NestInterceptor {
  private readonly fileInterceptor: ReturnType<typeof FileInterceptor>;

  constructor(private configService: ConfigService) {
    // 从配置服务获取最大文件大小，默认 100MB
    const maxFileSize = this.configService.get<number>(
      'app.upload.maxFileSize',
      100 * 1024 * 1024,
    );

    // 创建 FileInterceptor 实例，使用简化的过滤器
    this.fileInterceptor = FileInterceptor('file', {
      storage: memoryStorage(), // 使用标准内存存储
      limits: {
        fileSize: maxFileSize, // 文件大小限制
      },
      fileFilter: createDefaultImageFileFilter(maxFileSize, true),
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): any {
    // 创建拦截器实例并调用
    const interceptor = new (this.fileInterceptor as any)();
    return interceptor.intercept(context, next);
  }
}