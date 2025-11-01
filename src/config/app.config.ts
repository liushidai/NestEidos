import { registerAs } from '@nestjs/config';

/**
 * 应用配置
 * 包含文件上传相关配置
 */
export default registerAs('app', () => ({
  // 应用基础配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // 文件上传配置
  upload: {
    // 最大文件大小（字节）
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || `${100 * 1024 * 1024}`, 10), // 默认 100MB

    // 其他上传配置（为未来扩展预留）
    // allowedMimeTypes: process.env.UPLOAD_ALLOWED_MIME_TYPES?.split(',') || [],
    // maxFilesPerRequest: parseInt(process.env.UPLOAD_MAX_FILES_PER_REQUEST, 10) || 10,
    // tempDir: process.env.UPLOAD_TEMP_DIR || '/tmp/uploads',
  },
}));

/**
 * 配置验证模式
 * 可用于 Joi 或其他验证库
 */
export const appConfigSchema = {
  APP_PORT: {
    type: 'number',
    default: 3000,
  },
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    default: 'development',
  },
  UPLOAD_MAX_FILE_SIZE: {
    type: 'number',
    default: 100 * 1024 * 1024, // 100MB
    min: 1024, // 1KB 最小值
    max: 1024 * 1024 * 1024, // 1GB 最大值
  },
};