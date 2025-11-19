import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 创建拦截器实例并调用
    const interceptor = new (this.fileInterceptor as new (
      ...args: any[]
    ) => any)();
    return interceptor.intercept(context, next);
  }

  /**
   * 处理中文文件名的静态方法
   * 确保 Buffer 正确解码为 UTF-8 字符串
   */
  static decodeChineseFileName(fileName: string): string {
    if (!fileName) return fileName;

    try {
      // 尝试修复编码问题
      // Multer 在 Windows 上可能使用 latin1 编码处理文件名
      return Buffer.from(fileName, 'latin1').toString('utf8');
    } catch {
      // 如果解码失败，返回原始文件名
      return fileName;
    }
  }

  /**
   * 截断文件名以确保不超过数据库限制
   * 优先保留文件扩展名，截断主文件名部分
   */
  static truncateFileName(fileName: string, maxLength: number = 255): string {
    if (!fileName || fileName.length <= maxLength) {
      return fileName;
    }

    // 查找最后一个点号的位置（文件扩展名分隔符）
    const lastDotIndex = fileName.lastIndexOf('.');

    // 如果没有扩展名或文件名只是扩展名（如 ".gitignore"）
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      // 没有主文件名可以截断，直接截断整个文件名
      return fileName.substring(0, maxLength);
    }

    // 分离主文件名和扩展名
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex); // 包含点号

    // 计算主文件名的最大允许长度
    const maxNameLength = maxLength - extension.length;

    // 如果扩展名本身就太长，无法保留完整扩展名
    if (maxNameLength <= 0) {
      // 优先保留部分文件名，截断扩展名
      const maxExtLength = maxLength - 3; // 保留至少3个字符的主文件名
      if (maxExtLength <= 0) {
        // 极端情况：连3个字符都无法保留，直接截断
        return fileName.substring(0, maxLength);
      }
      const truncatedName = fileName.substring(0, 3);
      const truncatedExt = extension.substring(0, maxExtLength);
      return truncatedName + truncatedExt;
    }

    // 截断主文件名并保留完整扩展名
    const truncatedName = nameWithoutExt.substring(0, maxNameLength);
    return truncatedName + extension;
  }

  /**
   * 处理文件名：先修复中文编码，再截断超长部分
   */
  static processFileName(fileName: string, maxLength: number = 255): string {
    // 1. 修复中文编码问题
    const decodedFileName = this.decodeChineseFileName(fileName);

    // 2. 截断超长的文件名
    return this.truncateFileName(decodedFileName, maxLength);
  }
}
