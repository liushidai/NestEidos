import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';
import { getImageFormatByMimeType } from '@/common/constants/image-formats';
import { Request as ExpressRequest } from 'express';

import { generateSnowflakeId } from '@/utils/snowflake.util';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    userId: string;
    [key: string]: any;
  };
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly storagePath: string;

  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    private readonly configService: ConfigService,
  ) {
    this.storagePath = this.configService.get<string>('app.upload.storagePath', './uploads');
    // 确保上传目录存在
    fs.mkdir(this.storagePath, { recursive: true }).catch(() => {});
  }

  async create(
    createImageDto: CreateImageDto,
    userId: string,
    fileData: Express.Multer.File,
  ): Promise<Image> {
    const imageId = generateSnowflakeId();
    const tempFilePath = path.join(this.storagePath, `${imageId}_temp${path.extname(fileData.originalname)}`);

    try {
      // 1. 保存原始文件到临时位置
      await fs.writeFile(tempFilePath, fileData.buffer);

      // 2. 计算文件哈希（用于去重）
      const imageHash = this.calculateImageHash(fileData.buffer);

      // 3. 检查是否已存在相同的图片
      const existingImage = await this.imageRepository.findOne({
        where: { userId, imageHash },
      });

      if (existingImage) {
        await fs.unlink(tempFilePath); // 清理临时文件
        return existingImage;
      }

      // 4. 确定输出格式和路径
      const outputFormat = createImageDto.format || 'webp';
      const { webpPath, avifPath } = this.generateOutputPaths(imageId, this.storagePath, outputFormat);

      // 5. 生成 WebP 版本（始终生成）
      await this.convertToWebP(tempFilePath, webpPath);

      // 6. 按需生成 AVIF 版本
      if (outputFormat === 'avif') {
        await this.convertToAvif(tempFilePath, avifPath);
      }

      // 7. 设置过期策略和时间（直接使用 DTO 中的值，已由 @Transform 处理）
      const expirePolicy = createImageDto.expirePolicy || 1;
      let expiresAt: Date;

      switch (expirePolicy) {
        case 1: // 永久
          expiresAt = new Date('2099-12-31T23:59:59.999Z');
          break;
        case 2: // 指定时间
          expiresAt = createImageDto.expiresAt
            ? new Date(createImageDto.expiresAt)
            : new Date('2099-12-31T23:59:59.999Z');
          break;
        case 3: // 7天后
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        default:
          expiresAt = new Date('2099-12-31T23:59:59.999Z');
      }

      // 8. 获取 MIME 类型对应的扩展名
      const format = getImageFormatByMimeType(fileData.mimetype);
      const extension = format?.extensions[0] || 'jpg';

      // 9. 获取图片尺寸
      let imageWidth = 1; // 默认值以满足数据库约束
      let imageHeight = 1; // 默认值以满足数据库约束
      try {
        const metadata = await sharp(fileData.buffer).metadata();
        if (metadata.width && metadata.height) {
          imageWidth = metadata.width;
          imageHeight = metadata.height;
        }
      } catch (error) {
        this.logger.warn(`无法获取图片尺寸: ${error.message}`);
      }

      // 10. 保存到数据库（使用实体字段映射）
      const image = await this.imageRepository.create({
        id: imageId.toString(),
        userId,
        albumId: createImageDto.albumId || '0',
        title: createImageDto.title,
        originalName: fileData.originalname,
        imageHash,
        imageSize: fileData.size,
        imageMimeType: fileData.mimetype,
        imageWidth,
        imageHeight,
        originalKey: outputFormat === 'original' ? `${imageId}.${extension}` : `${imageId}_original.${extension}`,
        jpegKey: outputFormat === 'jpeg' ? `${imageId}.jpg` : null,
        webpKey: outputFormat === 'webp' ? null : `${imageId}.webp`,
        avifKey: outputFormat === 'avif' ? null : `${imageId}.avif`,
        hasJpeg: outputFormat === 'jpeg',
        hasWebp: outputFormat !== 'webp',
        hasAvif: outputFormat !== 'avif',
        defaultFormat: outputFormat as 'original' | 'webp' | 'avif',
        expirePolicy: expirePolicy,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedImage = await this.imageRepository.save(image);

      this.logger.log(`图片上传成功: ${fileData.originalname} -> ${savedImage.id}`);
      return savedImage;

    } catch (error) {
      this.logger.error(`图片上传失败: ${fileData.originalname}`, error);

      // 清理临时文件
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // 忽略清理错误
      }

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new InternalServerErrorException(`图片处理失败: ${errorMessage}`);
    }
  }

  private calculateImageHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private generateOutputPaths(imageId: string, storagePath: string, format: string) {
    const timestamp = Date.now();
    const webpPath = path.join(storagePath, `${imageId}_${timestamp}.webp`);
    const avifPath = path.join(storagePath, `${imageId}_${timestamp}.avif`);
    return { webpPath, avifPath };
  }

  private async convertToWebP(inputPath: string, outputPath: string): Promise<void> {
    // 确保目录存在
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(inputPath, { animated: true }).toFile(outputPath);
  }

  private async convertToAvif(inputPath: string, outputPath: string): Promise<void> {
    // 确保目录存在
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(inputPath, { animated: true }).toFile(outputPath);
  }

  /**
   * 根据用户ID分页查询图片
   */
  async findByUserId(userId: string, queryDto: QueryImageDto) {
    const { page = 1, limit = 20, albumId } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.imageRepository
      .createQueryBuilder('image')
      .where('image.userId = :userId', { userId });

    if (albumId) {
      queryBuilder.andWhere('image.albumId = :albumId', { albumId });
    }

    const [items, total] = await queryBuilder
      .orderBy('image.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

    // TODO: 删除物理文件

    await this.imageRepository.remove(image);
  }
}