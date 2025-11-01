import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  isSupportedMimeType,
  isMimeTypeMatchingExtension,
} from '../constants/image-formats';

/**
 * 图片文件过滤器选项
 */
export interface ImageFileFilterOptions {
  /** 最大文件大小（字节）- 必须参数 */
  maxSize: number;
  /** 是否严格模式（扩展名与MIME类型必须匹配） */
  strict?: boolean;
}

/**
 * 创建图片文件过滤器函数
 * 在文件上传最早阶段通过文件内容检测真实的 MIME 类型
 * 使用 memoryStorage() 时，file.buffer 在 fileFilter 被调用时已完整可用
 *
 * @param options 过滤器选项，maxSize 为必传参数
 */
export function createImageFileFilter(options: ImageFileFilterOptions) {
  const { maxSize, strict = true } = options;

  return async (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    try {
      // 1. 校验文件名非空
      if (!file.originalname || file.originalname.trim() === '') {
        return callback(new Error('文件名不能为空'), false);
      }

      // 2. 提取扩展名，用 ALLOWED_IMAGE_EXTENSIONS 校验
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension) {
        return callback(new Error('文件必须包含扩展名'), false);
      }

      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
        const supportedExts = Array.from(ALLOWED_IMAGE_EXTENSIONS).sort().join(', ');
        return callback(
          new Error(`不支持的文件扩展名: .${extension}。支持的扩展名: ${supportedExts}`),
          false
        );
      }

      // 3. 使用 file-type 检测真实 MIME（基于文件内容，不信任 file.mimetype）
      if (!file.buffer || file.buffer.length === 0) {
        return callback(new Error('文件内容为空'), false);
      }

      const fileType = await fileTypeFromBuffer(file.buffer);
      if (!fileType) {
        return callback(new Error('无法识别文件类型，可能不是有效的图片文件'), false);
      }

      // 4. 检查检测到的 MIME 是否在 ALLOWED_IMAGE_MIME_TYPES 中
      if (!isSupportedMimeType(fileType.mime)) {
        return callback(
          new Error(`不支持的文件类型: ${fileType.mime}。支持的类型: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`),
          false
        );
      }

      // 5. 若启用严格模式，验证扩展名与 MIME 是否匹配
      if (strict && !isMimeTypeMatchingExtension(fileType.mime, extension)) {
        return callback(
          new Error(`文件扩展名与内容不匹配: 扩展名 .${extension}, 检测到的类型 ${fileType.mime}`),
          false
        );
      }

      // 6. 所有校验通过，接受文件
      return callback(null, true);

    } catch (error) {
      console.error('文件验证过程中发生错误:', error);
      return callback(new Error('文件验证失败，请重试'), false);
    }
  };
}

/**
 * 创建默认图片文件过滤器
 * @param maxSize 最大文件大小（字节）
 * @param strict 是否严格模式，默认 true
 */
export const createDefaultImageFileFilter = (maxSize: number, strict = true) =>
  createImageFileFilter({ maxSize, strict });

/**
 * 创建宽松模式的图片文件过滤器（不严格检查扩展名与MIME匹配）
 * @param maxSize 最大文件大小（字节）
 */
export const createLenientImageFileFilter = (maxSize: number) =>
  createImageFileFilter({ maxSize, strict: false });

/**
 * 创建自定义配置的图片文件过滤器
 * @param options 过滤器选项
 */
export const createCustomImageFileFilter = (options: ImageFileFilterOptions) =>
  createImageFileFilter(options);