import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isSupportedMimeType } from '../constants/mime-type.constant';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly maxSize: number; // 最大文件大小，单位：字节
  private readonly allowedMimeTypes: string[]; // 允许的MIME类型列表

  constructor(maxSize: number = 100 * 1024 * 1024, allowedMimeTypes?: string[]) {
    this.maxSize = maxSize; // 默认100MB
    this.allowedMimeTypes = allowedMimeTypes || this.getDefaultAllowedMimeTypes();
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    // 验证文件是否存在
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    // 验证文件大小
    if (file.size > this.maxSize) {
      const maxSizeMB = Math.round(this.maxSize / (1024 * 1024));
      throw new BadRequestException(
        `文件大小不能超过 ${maxSizeMB}MB，当前文件大小为 ${Math.round(file.size / (1024 * 1024))}MB`
      );
    }

    // 验证MIME类型
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      const supportedTypes = this.allowedMimeTypes.join(', ');
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}。支持的类型: ${supportedTypes}`
      );
    }

    // 验证文件名
    if (!file.originalname || file.originalname.trim() === '') {
      throw new BadRequestException('文件名不能为空');
    }

    // 验证文件扩展名是否与MIME类型匹配
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !this.isValidExtensionForMimeType(extension, file.mimetype)) {
      throw new BadRequestException(`文件扩展名与MIME类型不匹配: ${file.mimetype}`);
    }

    return file;
  }

  /**
   * 获取默认允许的MIME类型列表
   */
  private getDefaultAllowedMimeTypes(): string[] {
    return [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/tiff',
      'image/bmp',
      'image/svg+xml',
      'image/heif',
      'image/heic'
    ];
  }

  /**
   * 验证文件扩展名是否与MIME类型匹配
   */
  private isValidExtensionForMimeType(extension: string, mimeType: string): boolean {
    const extensionMimeTypeMap: Record<string, string[]> = {
      'jpg': ['image/jpeg', 'image/jpg'],
      'jpeg': ['image/jpeg', 'image/jpg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'webp': ['image/webp'],
      'avif': ['image/avif'],
      'tiff': ['image/tiff'],
      'bmp': ['image/bmp'],
      'svg': ['image/svg+xml'],
      'heif': ['image/heif'],
      'heic': ['image/heic']
    };

    const validMimeTypes = extensionMimeTypeMap[extension];
    return validMimeTypes ? validMimeTypes.includes(mimeType) : false;
  }

  /**
   * 静态工厂方法：创建图片文件验证Pipe
   */
  static createImagePipe(maxSize?: number): FileValidationPipe {
    return new FileValidationPipe(maxSize);
  }

  /**
   * 静态工厂方法：创建自定义MIME类型验证Pipe
   */
  static createCustomPipe(maxSize: number, mimeTypes: string[]): FileValidationPipe {
    return new FileValidationPipe(maxSize, mimeTypes);
  }
}