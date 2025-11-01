import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  isSupportedMimeType,
  isMimeTypeMatchingExtension,
} from '../constants/image-formats';

export interface ImageFileFilterOptions {
  /** 最大文件大小（字节） */
  maxSize: number;
  /** 是否严格模式（扩展名与MIME类型必须匹配） */
  strict?: boolean;
}

/**
 * 简化的图片文件过滤器
 * 统一处理：文件大小 + 扩展名 + MIME类型 + 匹配验证
 *
 * 优势：
 * 1. 单一职责：所有验证逻辑集中在一处
 * 2. 早期拦截：不支持的文件在上传开始时就被拒绝
 * 3. 简单可靠：基于完整文件内容，不依赖复杂的流式处理
 */
export function createSimplifiedImageFileFilter(options: ImageFileFilterOptions) {
  const { maxSize, strict = true } = options;

  return async (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): Promise<void> => {
    try {
      // 1. 基础文件名检查
      if (!file.originalname || file.originalname.trim() === '') {
        return callback(new Error('文件名不能为空'), false);
      }

      // 2. 扩展名校验
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension) {
        return callback(new Error('文件必须包含扩展名'), false);
      }

      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
        const supportedExts = Array.from(ALLOWED_IMAGE_EXTENSIONS).sort().join(', ');
        return callback(new Error(`不支持的文件扩展名: .${extension}。支持的扩展名: ${supportedExts}`), false);
      }

      // 3. 文件大小校验（基于已读取的内容）
      if (file.buffer && file.buffer.length > maxSize) {
        const sizeMB = (file.buffer.length / 1024 / 1024).toFixed(1);
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
        return callback(new Error(`文件过大：${sizeMB}MB，最大允许：${maxSizeMB}MB`), false);
      }

      // 4. 文件内容检查
      if (!file.buffer || file.buffer.length === 0) {
        return callback(new Error('文件内容为空'), false);
      }

      // 5. MIME类型检测（基于文件内容）
      const fileType = await fileTypeFromBuffer(file.buffer);
      if (!fileType) {
        return callback(new Error('无法识别文件类型，可能不是有效的图片文件'), false);
      }

      // 6. MIME类型支持检查
      if (!isSupportedMimeType(fileType.mime)) {
        return callback(new Error(`不支持的文件类型: ${fileType.mime}。支持的类型: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`), false);
      }

      // 7. 严格模式：扩展名与MIME匹配检查
      if (strict && !isMimeTypeMatchingExtension(fileType.mime, extension)) {
        return callback(new Error(`文件扩展名与内容不匹配: 扩展名 .${extension}, 检测到的类型 ${fileType.mime}`), false);
      }

      // 8. 所有校验通过
      return callback(null, true);

    } catch (error) {
      console.error('文件验证过程中发生错误:', error);
      return callback(new Error('文件验证失败，请重试'), false);
    }
  };
}

// 工厂函数：创建默认配置的过滤器
export function createDefaultImageFileFilter(maxSize: number, strict = true) {
  return createSimplifiedImageFileFilter({ maxSize, strict });
}