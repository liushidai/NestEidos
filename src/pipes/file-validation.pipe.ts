import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor() {
    // 注意：MAX_FILE_SIZE 应从 ConfigService 注入
    // constructor(private configService: ConfigService) {
    //   // 从配置服务读取文件大小限制
    // }
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    // 仅保留基础存在性检查
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    // 注意：
    // - 文件大小校验已由 Multer 的 limits.fileSize 覆盖
    // - MIME 类型校验已在 fileFilter 中完成
    // - 扩展名校验已在 fileFilter 中完成
    //
    // 此处为未来业务校验预留扩展空间，如：
    // - 用户配额检查
    // - 文件数量限制
    // - 特殊业务规则验证

    return file;
  }

  /**
   * 静态工厂方法：创建图片文件验证Pipe
   */
  static createImagePipe(): FileValidationPipe {
    return new FileValidationPipe();
  }
}