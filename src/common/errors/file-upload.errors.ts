/**
 * 文件上传相关错误类
 * 统一错误类型，确保 API 响应一致性
 */

/**
 * 文件上传基础错误类
 */
export abstract class FileUploadError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 文件验证错误
 */
export class FileValidationError extends FileUploadError {
  constructor(message: string, code: string = 'FILE_VALIDATION_ERROR') {
    super(message, code);
  }
}

/**
 * 文件类型不支持错误
 */
export class UnsupportedFileTypeError extends FileValidationError {
  constructor(extension?: string, mimeType?: string) {
    let message = '不支持的文件类型';
    if (extension) {
      message += `: .${extension}`;
    }
    if (mimeType) {
      message += ` (${mimeType})`;
    }
    super(message, 'UNSUPPORTED_FILE_TYPE');
  }
}

/**
 * 文件大小超限错误
 */
export class FileSizeExceededError extends FileValidationError {
  constructor(actualSize: number, maxSize: number) {
    const actualMB = (actualSize / 1024 / 1024).toFixed(1);
    const maxMB = (maxSize / 1024 / 1024).toFixed(1);
    super(`文件过大：${actualMB}MB，最大允许：${maxMB}MB`, 'FILE_SIZE_EXCEEDED');
  }
}

/**
 * 文件内容不匹配错误
 */
export class FileContentMismatchError extends FileValidationError {
  constructor(extension: string, detectedType: string) {
    super(`文件扩展名与内容不匹配: .${extension} vs ${detectedType}`, 'FILE_CONTENT_MISMATCH');
  }
}

/**
 * 文件名为空错误
 */
export class EmptyFilenameError extends FileValidationError {
  constructor() {
    super('文件名不能为空', 'EMPTY_FILENAME');
  }
}

/**
 * 文件无扩展名错误
 */
export class MissingExtensionError extends FileValidationError {
  constructor() {
    super('文件必须包含扩展名', 'MISSING_EXTENSION');
  }
}

/**
 * 文件内容为空错误
 */
export class EmptyFileContentError extends FileValidationError {
  constructor() {
    super('文件内容为空', 'EMPTY_FILE_CONTENT');
  }
}

/**
 * 文件类型识别失败错误
 */
export class FileTypeRecognitionError extends FileValidationError {
  constructor() {
    super('无法识别文件类型，可能不是有效的图片文件', 'FILE_TYPE_RECOGNITION_FAILED');
  }
}

/**
 * 文件验证系统错误
 */
export class FileValidationSystemError extends FileValidationError {
  constructor(originalError?: string) {
    super(`文件验证失败，请重试${originalError ? `: ${originalError}` : ''}`, 'FILE_VALIDATION_SYSTEM_ERROR');
  }
}

/**
 * 错误代码映射
 * 用于全局异常过滤器统一处理
 */
export const FILE_UPLOAD_ERROR_CODES = {
  FILE_VALIDATION_ERROR: 'FILE_VALIDATION_ERROR',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  FILE_CONTENT_MISMATCH: 'FILE_CONTENT_MISMATCH',
  EMPTY_FILENAME: 'EMPTY_FILENAME',
  MISSING_EXTENSION: 'MISSING_EXTENSION',
  EMPTY_FILE_CONTENT: 'EMPTY_FILE_CONTENT',
  FILE_TYPE_RECOGNITION_FAILED: 'FILE_TYPE_RECOGNITION_FAILED',
  FILE_VALIDATION_SYSTEM_ERROR: 'FILE_VALIDATION_SYSTEM_ERROR',
} as const;

export type FileUploadErrorCode = typeof FILE_UPLOAD_ERROR_CODES[keyof typeof FILE_UPLOAD_ERROR_CODES];