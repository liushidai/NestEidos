import {
  Controller,
  Get,
  Param,
  Res,
  Req,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExcludeController,
} from '@nestjs/swagger';
import { ImageService } from '../image/image.service';
import { StorageService } from '../../services/storage.service';
import { SecureIdUtil } from '../../utils/secure-id.util';

interface ImageAccessParams {
  key: string;
}

@ApiTags('图片访问')
@ApiExcludeController() // 从 Swagger 文档中排除，因为这是公开接口
@Controller('i')
export class ImageAccessController {
  private readonly logger = new Logger(ImageAccessController.name);

  // 内嵌的404 SVG图片内容
  private readonly notFoundImages: Record<string, string> = {
    geo_lines: `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景与边框 -->
  <rect width="100%" height="100%" fill="#f9f9f9" stroke="#e8e8e8" stroke-width="1" rx="3" ry="3"/>
  <!-- 装饰线条（四角点缀） -->
  <line x1="40" y1="40" x2="60" y2="40" stroke="#ddd" stroke-width="2"/>
  <line x1="340" y1="40" x2="360" y2="40" stroke="#ddd" stroke-width="2"/>
  <line x1="40" y1="160" x2="60" y2="160" stroke="#ddd" stroke-width="2"/>
  <line x1="340" y1="160" x2="360" y2="160" stroke="#ddd" stroke-width="2"/>
  <line x1="40" y1="40" x2="40" y2="60" stroke="#ddd" stroke-width="2"/>
  <line x1="360" y1="40" x2="360" y2="60" stroke="#ddd" stroke-width="2"/>
  <line x1="40" y1="160" x2="40" y2="140" stroke="#ddd" stroke-width="2"/>
  <line x1="360" y1="160" x2="360" y2="140" stroke="#ddd" stroke-width="2"/>
  <!-- 404 文字 -->
  <text x="200" y="75" font-size="52" font-weight="bold" fill="#666" text-anchor="middle" letter-spacing="2">404</text>
  <!-- 核心提示 -->
  <text x="200" y="125" font-size="26" fill="#333" text-anchor="middle" font-weight="500">图片不存在</text>
  <!-- 英文补充 -->
  <text x="200" y="155" font-size="14" fill="#999" text-anchor="middle" letter-spacing="1">Not Found</text>
</svg>`,

    minimal_icon: `<svg width="400" height="220" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="100%" height="100%" fill="#fafafa" stroke="#f0f0f0" stroke-width="1" rx="6" ry="6"/>
  <!-- 装饰图标（相机轮廓，简约风） -->
  <circle cx="200" cy="60" r="25" fill="none" stroke="#ddd" stroke-width="2"/>
  <rect x="185" y="50" width="30" height="15" fill="none" stroke="#ddd" stroke-width="2" rx="1" ry="1"/>
  <line x1="195" y1="75" x2="205" y2="75" stroke="#ddd" stroke-width="2"/>
  <!-- 分隔线 -->
  <line x1="100" y1="100" x2="300" y2="100" stroke="#eee" stroke-width="1"/>
  <!-- 主文字 -->
  <text x="200" y="135" font-size="24" fill="#333" text-anchor="middle" font-weight="500">图片资源未找到</text>
  <!-- 指引文字 -->
  <text x="200" y="165" font-size="15" fill="#777" text-anchor="middle">请检查链接是否正确或图片已被删除</text>
  <!-- 底部装饰线 -->
  <line x1="80" y1="190" x2="320" y2="190" stroke="#eee" stroke-width="1" stroke-dasharray="4,4"/>
</svg>`,

    gradient_accent: `<svg width="400" height="180" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- 装饰渐变条（顶部窄条） -->
  <defs>
    <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f0f0f0"/>
      <stop offset="50%" stop-color="#e0e0e0"/>
      <stop offset="100%" stop-color="#f0f0f0"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#777"/>
      <stop offset="100%" stop-color="#aaa"/>
    </linearGradient>
  </defs>
  <rect x="0" y="20" width="400" height="2" fill="url(#topGrad)"/>
  <!-- 大号404（渐变效果） -->
  <text x="200" y="95" font-size="72" font-weight="bold" fill="url(#textGrad)" text-anchor="middle">404</text>
  <!-- 简洁提示 -->
  <text x="200" y="140" font-size="20" fill="#555" text-anchor="middle" letter-spacing="0.5">图片不存在</text>
  <!-- 底部装饰点 -->
  <circle cx="180" cy="160" r="1.5" fill="#eee"/>
  <circle cx="200" cy="160" r="1.5" fill="#eee"/>
  <circle cx="220" cy="160" r="1.5" fill="#eee"/>
</svg>`,
  };

  constructor(
    private readonly imageService: ImageService,
    private readonly storageService: StorageService,
    private readonly secureIdUtil: SecureIdUtil,
  ) {}

  @Get('*path')
  @ApiOperation({ summary: '获取图片（通用路由）' })
  @ApiParam({
    name: 'path',
    description: '完整路径',
    example: 'I3v4yvfBs0D.webp',
  })
  @ApiResponse({ status: 200, description: '成功返回图片' })
  @ApiResponse({ status: 404, description: '图片不存在或已过期' })
  async getImage(@Req() req: Request, @Res() res: Response) {
    // 从请求路径中提取路径部分
    const urlPath = req.path;
    // 移除 /i/ 前缀
    const relativePath = urlPath.replace(/^\/i\//, '');

    // 解析路径和扩展名
    const lastDotIndex = relativePath.lastIndexOf('.');
    let key: string;
    let ext: string | null = null;

    if (lastDotIndex === -1) {
      // 没有扩展名
      key = relativePath;
    } else {
      // 有扩展名
      key = relativePath.substring(0, lastDotIndex);
      ext = relativePath.substring(lastDotIndex + 1);
    }

    return this.handleImageAccess(key, ext, res);
  }

  private async handleImageAccess(
    key: string,
    ext: string | null,
    res: Response,
  ) {
    try {
      // 1. 解码 secure ID 获取图片 ID
      let imageId: bigint;
      try {
        imageId = this.secureIdUtil.decode(key);
      } catch (error) {
        this.logger.warn(`无效的 secure ID: ${key}`);
        return this.returnNotFoundImage(res, 'minimal_icon');
      }

      // 2. 查询数据库获取图片信息
      const image = await this.imageService.findById(imageId.toString());
      if (!image) {
        this.logger.warn(`图片不存在: ID=${imageId}`);
        return this.returnNotFoundImage(res, 'minimal_icon');
      }

      // 3. 检查过期策略
      if (image.expirePolicy !== 1) {
        const now = new Date();
        const expiresAt = new Date(image.expiresAt);
        if (now > expiresAt) {
          this.logger.warn(`图片已过期: ID=${imageId}, expiresAt=${expiresAt}`);
          return this.returnNotFoundImage(res, 'minimal_icon');
        }
      }

      // 4. 确定要返回的图片 key
      let imageKey: string | null = null;
      let mimeType: string = 'image/jpeg'; // 默认 MIME 类型

      if (ext) {
        // 4a. 有指定后缀：根据后缀返回对应格式
        imageKey = this.getImageKeyByExt(image, ext);
        mimeType = this.getMimeTypeByExt(ext);

        if (!imageKey) {
          this.logger.warn(`指定格式的图片不存在: ID=${imageId}, ext=${ext}`);
          return this.returnNotFoundImage(res, 'minimal_icon');
        }
      } else {
        // 4b. 无指定后缀：根据 defaultFormat 返回对应格式
        imageKey = this.getImageKeyByDefaultFormat(image);

        if (imageKey) {
          mimeType = this.getMimeTypeByFormat(image.defaultFormat);
        } else {
          // 4c. defaultFormat 指定的文件不存在，依次尝试其他格式
          const fallbackKeys = [
            { key: image.avifKey, format: 'avif' },
            { key: image.webpKey, format: 'webp' },
            { key: image.jpegKey, format: 'jpeg' },
            { key: image.originalKey, format: 'original' },
          ];

          for (const item of fallbackKeys) {
            if (item.key) {
              imageKey = item.key;
              mimeType = this.getMimeTypeByFormat(item.format);
              break;
            }
          }
        }

        if (!imageKey) {
          this.logger.warn(`图片文件均不存在: ID=${imageId}`);
          return this.returnNotFoundImage(res, 'minimal_icon');
        }
      }

      // 5. 从 MinIO 获取图片
      try {
        const imageBuffer = await this.storageService.download(imageKey);

        // 设置响应头
        res.set({
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000', // 缓存一年
          ETag: `"${image.imageHash}"`, // 使用图片哈希作为 ETag
          'X-Image-ID': imageId.toString(),
          'X-Image-Format': ext || image.defaultFormat,
        });

        res.send(imageBuffer);
      } catch (error) {
        this.logger.warn(
          `图片文件不存在于存储中: key=${imageKey}, error=${error.message}`,
        );
        return this.returnNotFoundImage(res, 'minimal_icon');
      }
    } catch (error) {
      this.logger.error(`处理图片访问失败: key=${key}, ext=${ext}`, error);
      return this.returnNotFoundImage(res, 'minimal_icon');
    }
  }

  /**
   * 根据格式后缀获取对应的图片 key
   */
  private getImageKeyByExt(image: any, ext: string): string | null {
    const normalizedExt = ext.toLowerCase();

    switch (normalizedExt) {
      case 'original':
        return image.originalKey;
      case 'jpg':
      case 'jpeg':
        return image.jpegKey;
      case 'webp':
        return image.webpKey;
      case 'avif':
        return image.avifKey;
      default:
        return null;
    }
  }

  /**
   * 根据 defaultFormat 获取对应的图片 key
   */
  private getImageKeyByDefaultFormat(image: any): string | null {
    switch (image.defaultFormat) {
      case 'original':
        return image.originalKey;
      case 'jpeg':
        return image.jpegKey;
      case 'webp':
        return image.webpKey;
      case 'avif':
        return image.avifKey;
      default:
        return null;
    }
  }

  /**
   * 根据格式后缀获取 MIME 类型
   */
  private getMimeTypeByExt(ext: string): string {
    const normalizedExt = ext.toLowerCase();

    switch (normalizedExt) {
      case 'original':
        return 'application/octet-stream'; // 原始文件，让浏览器根据内容判断
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * 根据格式获取 MIME 类型
   */
  private getMimeTypeByFormat(format: string): string {
    switch (format) {
      case 'original':
        return 'application/octet-stream';
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * 返回 404 图片
   */
  private async returnNotFoundImage(
    res: Response,
    style: string = 'minimal_icon',
  ) {
    try {
      // 直接使用内嵌的 SVG 内容
      const svgContent =
        this.notFoundImages[style] || this.notFoundImages.minimal_icon;

      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // 404 图片缓存 1 小时
        'X-Image-NotFound': 'true',
      });

      res.send(svgContent);
    } catch (error) {
      this.logger.error(`返回 404 图片失败`, error);
      // 返回简单的 SVG 内容作为后备
      const fallbackSvg = this.generateFallbackSvg();
      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      });
      res.send(fallbackSvg);
    }
  }

  /**
   * 生成后备 SVG 内容
   */
  private generateFallbackSvg(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#f3f4f6"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
    图片未找到
  </text>
</svg>`;
  }
}
