import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import {
  JPEG_PRESETS,
  WEBP_PRESETS,
  AVIF_PRESETS,
  BMP_LOSSLESS_WEBP_PARAM,
  QUALITY_MAPPING,
  QualityType
} from '@/common/constants/image-conversion-params';
import { getImageFormatByMimeType } from '@/common/constants/image-formats';

export interface ConversionResult {
  format: 'jpeg' | 'webp' | 'avif';
  buffer: Buffer;
  success: boolean;
  error?: string;
}

export interface ImageMetadata {
  format: string;
  hasAlpha: boolean;
  pages?: number;
  width: number;
  height: number;
  hasTransparency: boolean;
  isAnimated: boolean;
}

export interface ConversionPlan {
  shouldGenerateJpeg: boolean;
  shouldGenerateWebp: boolean;
  shouldGenerateAvif: boolean;
  originalFormat: string;
  hasTransparency: boolean;
  isAnimated: boolean;
}

@Injectable()
export class ImageConversionService {
  private readonly logger = new Logger(ImageConversionService.name);

  /**
   * 获取图片元数据
   */
  async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        format: metadata.format || 'unknown',
        hasAlpha: metadata.hasAlpha || false,
        pages: metadata.pages,
        width: metadata.width || 0,
        height: metadata.height || 0,
        hasTransparency: !!(metadata.hasAlpha),
        isAnimated: (metadata.pages || 1) > 1,
      };
    } catch (error) {
      this.logger.error('获取图片元数据失败', error);
      throw new Error(`无法解析图片: ${error.message}`);
    }
  }

  /**
   * 根据原始格式确定转换计划
   */
  createConversionPlan(metadata: ImageMetadata): ConversionPlan {
    const { format, hasTransparency, isAnimated } = metadata;

    // SVG格式不转换
    if (format === 'svg') {
      return {
        shouldGenerateJpeg: false,
        shouldGenerateWebp: false,
        shouldGenerateAvif: false,
        originalFormat: format,
        hasTransparency,
        isAnimated,
      };
    }

    // 根据格式转换规则表生成转换计划
    let shouldGenerateJpeg = false;
    let shouldGenerateWebp = false;
    let shouldGenerateAvif = false;

    switch (format) {
      case 'jpeg':
        shouldGenerateJpeg = true;
        shouldGenerateWebp = true;
        shouldGenerateAvif = true;
        break;

      case 'png':
      case 'webp':
      case 'avif':
      case 'heif':
        shouldGenerateJpeg = !isAnimated; // 动图不生成JPG
        shouldGenerateWebp = true;
        shouldGenerateAvif = true;
        break;

      case 'gif':
        shouldGenerateJpeg = false; // GIF不生成JPG
        shouldGenerateWebp = true;
        shouldGenerateAvif = true;
        break;

      case 'bmp':
        // BMP特殊处理：转换为无损WebP替换原图，并额外生成JPG/有损WebP/AVIF
        shouldGenerateJpeg = true;
        shouldGenerateWebp = true; // 会有两个WebP：无损替换原图 + 有损
        shouldGenerateAvif = true;
        break;

      default:
        // 其他支持的格式按通用规则处理
        shouldGenerateJpeg = !isAnimated;
        shouldGenerateWebp = true;
        shouldGenerateAvif = true;
        break;
    }

    return {
      shouldGenerateJpeg,
      shouldGenerateWebp,
      shouldGenerateAvif,
      originalFormat: format,
      hasTransparency,
      isAnimated,
    };
  }

  /**
   * 转换图片为指定格式
   */
  async convertImage(
    buffer: Buffer,
    targetFormat: 'jpeg' | 'webp' | 'avif',
    quality: number = 1, // 默认使用通用质量
    metadata?: ImageMetadata,
  ): Promise<ConversionResult> {
    try {
      if (!metadata) {
        metadata = await this.getImageMetadata(buffer);
      }

      const qualityType = QUALITY_MAPPING[quality as QualityType] || 'general';
      const { hasTransparency, isAnimated, format } = metadata;

      // 构建Sharp处理管道
      let pipeline = sharp(buffer, { animated: isAnimated });

      // JPG透明处理：如果有透明通道，填充白色背景
      if (targetFormat === 'jpeg' && hasTransparency) {
        pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
      }

      // 获取转换参数
      let convertParams: any;

      switch (targetFormat) {
        case 'jpeg':
          convertParams = JPEG_PRESETS[qualityType];
          break;

        case 'webp':
          // BMP格式特殊处理：无损WebP
          if (format === 'bmp') {
            convertParams = BMP_LOSSLESS_WEBP_PARAM;
          } else {
            convertParams = WEBP_PRESETS[qualityType](hasTransparency, isAnimated);
          }
          break;

        case 'avif':
          convertParams = AVIF_PRESETS[qualityType](hasTransparency, isAnimated);
          break;

        default:
          throw new Error(`不支持的输出格式: ${targetFormat}`);
      }

      // 执行转换
      const outputBuffer = await pipeline[targetFormat](convertParams).toBuffer();

      this.logger.debug(
        `图片转换成功: ${format} -> ${targetFormat}, 质量: ${qualityType}, 大小: ${buffer.length} -> ${outputBuffer.length} bytes`
      );

      return {
        format: targetFormat,
        buffer: outputBuffer,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `图片转换失败: ${metadata?.format || 'unknown'} -> ${targetFormat}`,
        error
      );

      return {
        format: targetFormat,
        buffer: Buffer.alloc(0),
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量转换图片
   */
  async convertImageBatch(
    buffer: Buffer,
    formats: ('jpeg' | 'webp' | 'avif')[],
    quality: number = 1,
  ): Promise<ConversionResult[]> {
    // 获取一次元数据，避免重复解析
    const metadata = await this.getImageMetadata(buffer);
    const results: ConversionResult[] = [];

    for (const format of formats) {
      const result = await this.convertImage(buffer, format, quality, metadata);
      results.push(result);
    }

    return results;
  }

  /**
   * BMP特殊处理：生成无损WebP替换原图
   */
  async convertBmpToLosslessWebP(buffer: Buffer): Promise<ConversionResult> {
    try {
      const outputBuffer = await sharp(buffer)
        .webp(BMP_LOSSLESS_WEBP_PARAM)
        .toBuffer();

      this.logger.debug(
        `BMP无损转换成功: BMP -> WebP, 大小: ${buffer.length} -> ${outputBuffer.length} bytes`
      );

      return {
        format: 'webp',
        buffer: outputBuffer,
        success: true,
      };
    } catch (error) {
      this.logger.error('BMP无损转换失败', error);
      return {
        format: 'webp',
        buffer: Buffer.alloc(0),
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 验证图片格式是否支持
   */
  isSupportedFormat(mimeType: string): boolean {
    const format = getImageFormatByMimeType(mimeType);
    return !!format;
  }
}