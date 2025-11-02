import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';
import { getImageFormatByMimeType } from '@/common/constants/image-formats';
import {
  JPEG_PRESETS,
  WEBP_PRESETS,
  AVIF_PRESETS,
  QUALITY_MAPPING,
  QualityType
} from '@/common/constants/image-conversion-params';
import { StorageService } from '@/services/storage.service';
import { ImageConversionService } from '@/services/image-conversion.service';
import { SecureIdUtil } from '@/utils/secure-id.util';
import { generateSnowflakeId } from '@/utils/snowflake.util';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly imageConversionService: ImageConversionService,
    private readonly secureIdUtil: SecureIdUtil,
  ) {}

  async create(
    createImageDto: CreateImageDto,
    userId: string,
    fileData: Express.Multer.File,
  ): Promise<Image> {
    const imageId = generateSnowflakeId();
    const qualityType = QUALITY_MAPPING[createImageDto.quality as QualityType] || 'general';

    try {
      // 1. 验证图片格式
      if (!this.imageConversionService.isSupportedFormat(fileData.mimetype)) {
        throw new BadRequestException(`不支持的图片格式: ${fileData.mimetype}`);
      }

      // 2. 计算文件哈希（仅用于完整性校验）
      const imageHash = this.calculateImageHash(fileData.buffer);

      // 3. 获取图片元数据
      const metadata = await this.imageConversionService.getImageMetadata(fileData.buffer);
      const { width, height, hasTransparency, isAnimated, format } = metadata;

      // 4. 生成安全的URL
      const secureUrl = this.secureIdUtil.encode(BigInt(imageId));

      // 5. 获取原始文件扩展名
      const imageFormat = getImageFormatByMimeType(fileData.mimetype);
      const originalExtension = imageFormat?.extensions[0] || 'jpg';

      // 6. 创建转换计划
      const conversionPlan = this.imageConversionService.createConversionPlan(metadata);

      // 7. 准备转换参数
      const convertJpegParam = conversionPlan.shouldGenerateJpeg ? JPEG_PRESETS[qualityType] : {};
      const convertWebpParam = conversionPlan.shouldGenerateWebp
        ? (format === 'bmp' ? { lossless: true, reductionEffort: 6 } : WEBP_PRESETS[qualityType](hasTransparency, isAnimated))
        : {};
      const convertAvifParam = conversionPlan.shouldGenerateAvif ? AVIF_PRESETS[qualityType](hasTransparency, isAnimated) : {};

      // 8. 上传原始文件
      let originalBuffer = fileData.buffer;
      let originalKey = `originals/${secureUrl}.${originalExtension}`;
      let originalMimeType = fileData.mimetype;

      // BMP特殊处理：转换为无损WebP替换原图
      if (format === 'bmp') {
        const bmpResult = await this.imageConversionService.convertBmpToLosslessWebP(fileData.buffer);
        if (bmpResult.success) {
          originalBuffer = bmpResult.buffer;
          originalKey = `originals/${secureUrl}.webp`;
          originalMimeType = 'image/webp'; // 更新MIME类型
        } else {
          throw new InternalServerErrorException(`BMP转换失败: ${bmpResult.error}`);
        }
      }

      await this.storageService.upload(originalKey, originalBuffer, originalMimeType);

      // 9. 转换并上传其他格式
      let jpegKey: string | null = null;
      let webpKey: string | null = null;
      let avifKey: string | null = null;

      const formatsToConvert: ('jpeg' | 'webp' | 'avif')[] = [];
      if (conversionPlan.shouldGenerateJpeg) formatsToConvert.push('jpeg');
      if (conversionPlan.shouldGenerateWebp) formatsToConvert.push('webp'); // 包含BMP的有损WebP转换
      if (conversionPlan.shouldGenerateAvif) formatsToConvert.push('avif');

      if (formatsToConvert.length > 0) {
        const conversionResults = await this.imageConversionService.convertImageBatch(
          fileData.buffer,
          formatsToConvert,
          createImageDto.quality || 1,
        );

        for (const result of conversionResults) {
          if (result.success) {
            const key = `processed/${secureUrl}.${result.format}`;
            const mimeType = `image/${result.format}`;

            await this.storageService.upload(key, result.buffer, mimeType);

            switch (result.format) {
              case 'jpeg':
                jpegKey = key;
                break;
              case 'webp':
                webpKey = key;
                break;
              case 'avif':
                avifKey = key;
                break;
            }
          } else {
            this.logger.warn(`图片转换失败: ${format} -> ${result.format}, 错误: ${result.error}`);
          }
        }
      }

      // 10. 设置过期策略和时间
      const expirePolicy = createImageDto.expirePolicy || 1;
      let expiresAt: Date;

      switch (expirePolicy) {
        case 1: // 永久
          expiresAt = new Date('9999-12-31T23:59:59.999Z');
          break;
        case 2: // 指定时间
          expiresAt = createImageDto.expiresAt
            ? new Date(createImageDto.expiresAt)
            : new Date('9999-12-31T23:59:59.999Z');
          break;
        case 3: // 7天后
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        default:
          expiresAt = new Date('9999-12-31T23:59:59.999Z');
      }

      // 11. 保存到数据库
      const image = await this.imageRepository.create({
        id: imageId.toString(),
        userId,
        albumId: createImageDto.albumId || '0',
        title: createImageDto.title,
        originalName: fileData.originalname,
        imageHash,
        imageSize: fileData.size,
        imageMimeType: fileData.mimetype,
        imageWidth: width,
        imageHeight: height,
        hasTransparency,
        isAnimated,
        originalKey,
        jpegKey,
        webpKey,
        avifKey,
        hasJpeg: !!jpegKey,
        hasWebp: !!webpKey,
        hasAvif: !!avifKey,
        convertJpegParam,
        convertWebpParam,
        convertAvifParam,
        defaultFormat: createImageDto.format as 'original' | 'jpeg' | 'webp' | 'avif' || 'avif',
        expirePolicy,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedImage = await this.imageRepository.save(image);

      this.logger.log(
        `图片上传成功: ${fileData.originalname} -> ${savedImage.id}, 转换格式: [${formatsToConvert.join(', ')}]`
      );
      return savedImage;

    } catch (error) {
      this.logger.error(`图片上传失败: ${fileData.originalname}`, error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new InternalServerErrorException(`图片处理失败: ${errorMessage}`);
    }
  }

  private calculateImageHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * 根据用户ID分页查询图片
   */
  async findByUserId(userId: string, queryDto: QueryImageDto) {
    const { page = '1', limit = '20', albumId } = queryDto;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.imageRepository
      .createQueryBuilder('image')
      .where('image.userId = :userId', { userId });

    if (albumId) {
      queryBuilder.andWhere('image.albumId = :albumId', { albumId });
    }

    const [items, total] = await queryBuilder
      .orderBy('image.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * 根据ID和用户ID查找单张图片
   */
  async findByIdAndUserId(id: string, userId: string) {
    const image = await this.imageRepository.findOne({
      where: { id, userId },
    });

    if (!image) {
      throw new NotFoundException('图片不存在');
    }

    return image;
  }

  /**
   * 更新图片信息
   */
  async update(id: string, userId: string, updateImageDto: UpdateImageDto) {
    const image = await this.findByIdAndUserId(id, userId);

    Object.assign(image, updateImageDto);
    image.updatedAt = new Date();

    return this.imageRepository.save(image);
  }

  /**
   * 删除图片
   */
  async delete(id: string, userId: string) {
    const image = await this.findByIdAndUserId(id, userId);

    try {
      // 收集要删除的文件键
      const keysToDelete: string[] = [];

      // 添加原始文件
      if (image.originalKey) {
        keysToDelete.push(image.originalKey);
      }

      // 添加转换后的文件
      if (image.jpegKey) keysToDelete.push(image.jpegKey);
      if (image.webpKey) keysToDelete.push(image.webpKey);
      if (image.avifKey) keysToDelete.push(image.avifKey);

      // 从MinIO删除文件
      if (keysToDelete.length > 0) {
        await this.storageService.deleteMany(keysToDelete);
        this.logger.debug(`已删除 ${keysToDelete.length} 个文件: ${keysToDelete.join(', ')}`);
      }

      // 从数据库删除记录
      await this.imageRepository.remove(image);

      this.logger.log(`图片删除成功: ${id}`);
    } catch (error) {
      this.logger.error(`删除图片失败: ${id}`, error);
      throw new InternalServerErrorException(`删除图片失败: ${error.message}`);
    }
  }
}