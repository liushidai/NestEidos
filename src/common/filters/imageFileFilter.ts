import { Request } from 'express';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  isSupportedMimeType,
  isMimeTypeMatchingExtension,
} from '../constants/image-formats';
import {
  EmptyFilenameError,
  MissingExtensionError,
  UnsupportedFileTypeError,
  FileContentMismatchError,
  FileValidationSystemError,
} from '../errors/file-upload.errors';

export interface ImageFileFilterOptions {
  /** 是否严格模式（扩展名与MIME类型必须匹配） */
  strict?: boolean;
  /**
   * 最大文件大小（字节）- 保留字段用于配置
   * 注意：实际文件大小限制由 Multer limits.fileSize 和自定义存储处理
   * 此过滤器仅做声明信息的轻量校验
   */
  maxSize?: number;
}

/**
 * 图片文件过滤器 - 轻量声明信息校验器
 *
 * 🔥 职责说明：
 * 此过滤器仅处理"声明信息"的早期校验，不进行深度验证：
 * 1. 文件名基础检查（非空、包含扩展名）
 * 2. 扩展名白名单检查（基于文件名声明）
 * 3. 轻量MIME类型检查（基于HTTP声明，非实际内容检测）
 * 4. 严格模式下的扩展名与MIME匹配检查（防止明显伪造）
 *
 * ⚡ 深度验证委托：
 * - 实际文件内容类型检测 → 由自定义 ValidatedMemoryStorage 处理
 * - 文件大小限制 → 由 Multer limits.fileSize + 存储层处理
 * - 真实MIME类型验证 → 在流式读取阶段完成
 *
 * 🎯 设计优势：
 * - 轻量快速：不等待完整文件内容，立即处理明显错误
 * - 职责清晰：声明信息校验 + 内容深度验证分离
 * - 早期拦截：明显不合规文件在开始时就被拒绝
 * - 性能优化：避免不必要的完整文件读取
 *
 * 📝 保留 maxSize 参数说明：
 * 虽然文件大小主要由 Multer limits 处理，但保留 maxSize 参数：
 * - 用于文档说明和配置一致性
 * - 为未来扩展预留接口
 * - 与现有API保持兼容
 */
export function createSimplifiedImageFileFilter(options: ImageFileFilterOptions) {
  const { maxSize, strict = true } = options;

  return (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    try {
      // 📝 第一阶段：声明信息轻量校验
      // 1. 基础文件名检查
      if (!file.originalname || file.originalname.trim() === '') {
        return callback(new EmptyFilenameError(), false);
      }

      // 2. 扩展名存在性检查
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension) {
        return callback(new MissingExtensionError(), false);
      }

      // 3. 扩展名白名单检查（基于文件名声明）
      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
        const supportedExts = Array.from(ALLOWED_IMAGE_EXTENSIONS).sort().join(', ');
        return callback(new UnsupportedFileTypeError(extension), false);
      }

      // 📝 第二阶段：声明信息一致性检查
      // 4. HTTP MIME类型声明检查（轻量，基于客户端声明）
      const declaredMime = file.mimetype?.toLowerCase();
      if (!declaredMime || !isSupportedMimeType(declaredMime)) {
        return callback(new UnsupportedFileTypeError(undefined, declaredMime), false);
      }

      // 5. 严格模式：扩展名与声明MIME匹配检查（防止明显伪造）
      if (strict && !isMimeTypeMatchingExtension(declaredMime, extension)) {
        return callback(new FileContentMismatchError(extension, declaredMime), false);
      }

      // ✅ 所有轻量校验通过，文件将被接受
      // 🔥 注意：实际文件内容的深度验证（真实MIME检测、大小限制等）
      //      将由自定义 ValidatedMemoryStorage 在流式处理阶段完成
      return callback(null, true);

    } catch (error) {
      console.error('文件过滤器处理过程中发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return callback(new FileValidationSystemError(errorMessage), false);
    }
  };
}

// 工厂函数：创建默认配置的过滤器
export function createDefaultImageFileFilter(maxSize: number, strict = true) {
  return createSimplifiedImageFileFilter({ maxSize, strict });
}