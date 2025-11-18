import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/**
 * 系统配置响应 DTO
 * 返回当前系统的关键配置信息，供前端使用
 */
export class SystemConfigResponseDto {
  @ApiProperty({
    description: '是否允许用户注册',
    example: true,
    type: 'boolean',
  })
  @Allow()
  enableUserRegistration: boolean;

  @ApiProperty({
    description: '最大文件上传大小（字节）',
    example: 104857600,
    type: 'number',
  })
  @Allow()
  maxFileSize: number;

  @ApiProperty({
    description: '最大文件上传大小（MB）',
    example: 100,
    type: 'number',
  })
  @Allow()
  maxFileSizeMB: number;

  @ApiProperty({
    description: '允许的图片格式列表',
    example: [
      'JPEG',
      'PNG',
      'GIF',
      'WebP',
      'AVIF',
      'BMP',
      'SVG',
      'HEIF',
      'HEIC',
    ],
    type: 'array',
    items: {
      type: 'string',
    },
  })
  @Allow()
  supportedFormats: string[];

  @ApiProperty({
    description: '允许的MIME类型列表',
    example: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/bmp',
      'image/x-ms-bmp',
      'image/svg+xml',
      'image/heif',
      'image/heic',
    ],
    type: 'array',
    items: {
      type: 'string',
    },
  })
  @Allow()
  allowedMimeTypes: string[];

  @ApiProperty({
    description: '允许的文件扩展名列表',
    example: [
      'jpg',
      'jpeg',
      'jfif',
      'pjpeg',
      'pjp',
      'png',
      'gif',
      'webp',
      'avif',
      'avifs',
      'bmp',
      'dib',
      'svg',
      'svgz',
      'heif',
      'hif',
      'heic',
      'heifs',
    ],
    type: 'array',
    items: {
      type: 'string',
    },
  })
  @Allow()
  allowedExtensions: string[];

  @ApiProperty({
    description: '项目域名，用于生成完整URL和API文档链接',
    example: 'http://localhost:3000',
    type: 'string',
  })
  @Allow()
  appDomain: string;

  @ApiProperty({
    description: '是否启用 Swagger API 文档',
    example: true,
    type: 'boolean',
  })
  @Allow()
  enableSwagger: boolean;

  @ApiProperty({
    description: '健康检查接口状态（独立于Swagger配置）',
    example: true,
    type: 'boolean',
  })
  @Allow()
  healthCheckAvailable: boolean;

  @ApiProperty({
    description: '健康检查接口地址',
    example: '/health',
    type: 'string',
  })
  @Allow()
  healthCheckEndpoint: string;
}
