import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import { SystemConfigResponseDto } from './dto/system-config-response.dto';
import { IMAGE_FORMATS, ALLOWED_IMAGE_MIME_TYPES, ALLOWED_IMAGE_EXTENSIONS } from '../../common/constants/image-formats';

/**
 * 系统配置控制器
 * 提供系统级配置信息的公开访问接口，无需认证
 */
@ApiTags('系统配置')
@Controller('system')
export class SystemController {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: '获取系统配置信息',
    description: '获取当前系统的关键配置信息，包括注册开关、上传限制、Swagger状态等，无需认证'
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: SystemConfigResponseDto,
  })
  async getSystemConfig(): Promise<SystemConfigResponseDto> {
    // 获取用户注册开关状态
    const enableUserRegistration = this.configService.get<boolean>('ENABLE_USER_REGISTRATION', true);

    // 获取文件上传大小限制
    const appConfig = this.configService.get<AppConfig>('app');
    const maxFileSize = appConfig?.upload?.maxFileSize || 100 * 1024 * 1024; // 默认100MB
    const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024));

    // 获取项目域名配置
    const appDomain = this.configService.get<string>('APP_DOMAIN', 'http://localhost:3000');

    // 获取 Swagger 文档开关状态
    const enableSwagger = this.configService.get<boolean>('ENABLE_SWAGGER', true);

    // 获取支持的图片格式信息
    const supportedFormats = Object.keys(IMAGE_FORMATS);
    const allowedMimeTypes = [...ALLOWED_IMAGE_MIME_TYPES];
    const allowedExtensions = [...ALLOWED_IMAGE_EXTENSIONS];

    return {
      enableUserRegistration,
      maxFileSize,
      maxFileSizeMB,
      supportedFormats,
      allowedMimeTypes,
      allowedExtensions,
      appDomain,
      enableSwagger,
    };
  }
}