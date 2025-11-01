import { Injectable, NotFoundException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
import { ImageRepository } from './repositories/image.repository';
import { FileRepository } from './repositories/file.repository';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';
import { SnowflakeUtil } from '../../utils/snowflake.util';
import { SecureIdUtil } from '../../utils/secure-id.util';
import { StorageService } from '../../services/storage.service';
import { TempFileService } from '../../services/temp-file.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { getImageFormatByMimeType } from '../../common/constants/image-formats';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly secureIdUtil: SecureIdUtil;

  constructor(
    private readonly imageRepository: ImageRepository,
    private readonly fileRepository: FileRepository,
    private readonly storageService: StorageService,
    private readonly tempFileService: TempFileService,
    private readonly configService: ConfigService,
  ) {
    this.secureIdUtil = SecureIdUtil.getInstance(configService);
  }

  /**
   * 处理完整的图片上传流程
   */
  async create(createImageDto: CreateImageDto, userId: string, fileData: Express.Multer.File): Promise<Image> {
    const snowflake = SnowflakeUtil.getInstance();
    const imageId = snowflake.nextId();
    const now = new Date();
    let tempFilePath: string | null = null;
    let webpPath: string | null = null;
    let avifPath: string | null = null;

    this.logger.debug(`开始处理图片上传: ${fileData.originalname}, userId: ${userId}`);

    try {
      // 1. 保存文件到临时位置
      tempFilePath = await this.tempFileService.saveTempFile(fileData);

      // 2. 计算文件哈希值
      const hash = await this.calculateFileHash(tempFilePath);

      // 3. 检查是否已存在相同哈希的文件（去重）
      let existingFile = await this.fileRepository.findByHash(hash);

      if (!existingFile) {
        // 4. 获取图片元数据
        const metadata = await this.getImageMetadata(tempFilePath);

        // 5. 生成存储路径（基于文件ID，而不是图片ID）
        const fileId = snowflake.nextId();
        const pathInfo = this.generateStoragePaths(fileId, metadata.format);

        // 6. 格式转换
        const conversionResult = await this.convertImageFormats(tempFilePath, metadata.format);

        // 7. 上传到对象存储
        const uploadKeys = await this.uploadImagesToStorage(
          tempFilePath,
          pathInfo,
          fileData.mimetype,
          conversionResult
        );

        // 8. 创建文件记录
        existingFile = await this.fileRepository.create({
          id: fileId.toString(),
          hash,
          fileSize: fileData.size,
          mimeType: fileData.mimetype,
          width: metadata.width,
          height: metadata.height,
          originalKey: uploadKeys.original,
          webpKey: uploadKeys.webp,
          avifKey: uploadKeys.avif,
          hasWebp: !!uploadKeys.webp,
          hasAvif: !!uploadKeys.avif,
          createdAt: now,
        });
        this.logger.log(`新文件上传成功: ${fileId}, 哈希: ${hash}`);
      } else {
        this.logger.log(`发现重复文件，复用已有文件记录: ${existingFile.id}, 哈希: ${hash}`);
        // 清理临时文件
        await this.tempFileService.deleteTempFile(tempFilePath);
      }

      // 9. 创建图片记录
      const image = await this.imageRepository.create({
        id: imageId,
        userId,
        albumId: createImageDto.albumId || '0',
        title: createImageDto.title,
        originalName: fileData.originalname,
        fileId: existingFile.id,
        createdAt: now,
        updatedAt: now,
      });

      this.logger.log(`图片记录创建成功: ${imageId}, 原始文件: ${fileData.originalname}`);

      return image;

    } catch (error) {
      this.logger.error(`图片上传失败: ${fileData.originalname}`, error);
      throw new InternalServerErrorException('图片处理失败');
    } finally {
      // 清理临时文件
      const tempFilesToDelete = [tempFilePath, webpPath, avifPath].filter(Boolean) as string[];
      if (tempFilesToDelete.length > 0) {
        await this.tempFileService.deleteTempFiles(tempFilesToDelete);
      }
    }
  }

  /**
   * 根据ID查找图片
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findById(id: string): Promise<Image | null> {
    this.logger.debug(`查找图片: ${id}`);
    return await this.imageRepository.findById(id);
  }

  /**
   * 根据ID和用户ID查找图片
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Image | null> {
    this.logger.debug(`查找用户图片: imageId=${id}, userId=${userId}`);
    return await this.imageRepository.findByIdAndUserId(id, userId);
  }

  /**
   * 分页查询用户的图片
   * 委托给Repository处理，Repository层决定是否使用缓存
   */
  async findByUserId(userId: string, queryDto: QueryImageDto) {
    const { page = 1, limit = 10, search, albumId, mimeType } = queryDto;

    // 验证分页参数
    const validatedPage = Number.parseInt(page.toString(), 10);
    const validatedLimit = Number.parseInt(limit.toString(), 10);

    if (validatedPage < 1 || validatedLimit < 1 || validatedLimit > 100) {
      throw new BadRequestException('分页参数无效');
    }

    this.logger.debug(`分页查询用户图片: userId=${userId}, page=${validatedPage}, limit=${validatedLimit}, search=${search}, albumId=${albumId}`);

    return await this.imageRepository.findByUserId(
      userId,
      validatedPage,
      validatedLimit,
      search,
      albumId,
      mimeType
    );
  }

  /**
   * 更新图片信息
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async update(id: string, userId: string, updateImageDto: UpdateImageDto): Promise<Image> {
    this.logger.debug(`更新图片: imageId=${id}, userId=${userId}`);

    try {
      const { updatedImage } = await this.imageRepository.update(id, userId, updateImageDto);
      return updatedImage;
    } catch (error) {
      if (error.message === '图片不存在或无权限操作') {
        throw new NotFoundException('图片不存在或无权限操作');
      }
      throw error;
    }
  }

  /**
   * 删除图片
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async delete(id: string, userId: string): Promise<void> {
    this.logger.debug(`删除图片: imageId=${id}, userId=${userId}`);

    try {
      const image = await this.imageRepository.findByIdAndUserId(id, userId);
      if (!image) {
        throw new NotFoundException('图片不存在或无权限操作');
      }

      const fileId = image.fileId;

      // 删除图片记录
      await this.imageRepository.delete(id, userId);

      // 检查是否还有其他图片引用这个文件
      const remainingImagesCount = await this.imageRepository.countByFileId(fileId);

      if (remainingImagesCount === 0) {
        // 没有其他图片引用，删除文件记录和物理文件
        const file = await this.fileRepository.findById(fileId);
        if (file) {
          // 删除对象存储中的文件
          const keysToDelete = [file.originalKey];
          if (file.webpKey) keysToDelete.push(file.webpKey);
          if (file.avifKey) keysToDelete.push(file.avifKey);

          try {
            await this.storageService.deleteMany(keysToDelete);
            this.logger.log(`删除物理文件成功: ${keysToDelete.join(', ')}`);
          } catch (error) {
            this.logger.error(`删除物理文件失败: ${keysToDelete.join(', ')}`, error);
          }

          // 删除文件记录
          await this.fileRepository.delete(fileId);
          this.logger.log(`删除文件记录成功: ${fileId}`);
        }
      } else {
        this.logger.log(`文件仍被其他图片引用，仅删除图片记录: imageId=${id}, fileId=${fileId}`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message === '图片不存在或无权限操作') {
        throw new NotFoundException('图片不存在或无权限操作');
      }
      throw error;
    }
  }

  /**
   * 检查图片是否属于用户
   * 委托给Repository处理，Repository层负责实时查询
   */
  async isImageBelongsToUser(imageId: string, userId: string): Promise<boolean> {
    this.logger.debug(`检查图片归属: imageId=${imageId}, userId=${userId}`);
    return await this.imageRepository.isImageBelongsToUser(imageId, userId);
  }

  /**
   * 计算文件的 SHA-256 哈希值
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);

      stream.on('data', (data: Buffer) => {
        hash.update(data);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * 获取图片元数据
   */
  private async getImageMetadata(filePath: string): Promise<sharp.Metadata> {
    try {
      const metadata = await sharp(filePath).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('无法获取图片尺寸信息');
      }

      return metadata;
    } catch (error) {
      this.logger.error('获取图片元数据失败', error);
      throw new InternalServerErrorException('图片格式不支持或文件损坏');
    }
  }

  /**
   * 生成存储路径
   */
  private generateStoragePaths(imageId: string, format?: string): { original: string; webp: string; avif: string } {
    const encodedId = this.secureIdUtil.encode(BigInt(imageId));

    const extension = format ? getImageFormatByMimeType(format)?.extensions[0] || 'jpg' : 'jpg';

    return {
      original: `images/${encodedId}-o.${extension}`,
      webp: `images/${encodedId}-w.webp`,
      avif: `images/${encodedId}-a.avif`
    };
  }

  /**
   * 格式转换
   */
  private async convertImageFormats(
    originalPath: string,
    originalFormat: string
  ): Promise<{ webpPath?: string; avifPath?: string }> {
    const result: { webpPath?: string; avifPath?: string } = {};

    try {
      // 生成 WebP 格式（除了 WebP 原始格式）
      if (originalFormat !== 'webp') {
        result.webpPath = await this.tempFileService.createTempFile('', 'webp');
        await sharp(originalPath)
          .webp({ quality: 85 })
          .toFile(result.webpPath);

        // 验证转换后的文件
        const webpStats = await this.tempFileService.getFileSize(result.webpPath);
        if (webpStats === 0) {
          delete result.webpPath;
        }
      }

      // 生成 AVIF 格式（除了 AVIF 原始格式）
      if (originalFormat !== 'avif') {
        result.avifPath = await this.tempFileService.createTempFile('', 'avif');
        await sharp(originalPath)
          .avif({ quality: 85 })
          .toFile(result.avifPath);

        // 验证转换后的文件
        const avifStats = await this.tempFileService.getFileSize(result.avifPath);
        if (avifStats === 0) {
          delete result.avifPath;
        }
      }

    } catch (error) {
      this.logger.warn('图片格式转换部分失败', error);
      // 格式转换失败不应该阻断整个流程，继续使用原始格式
    }

    return result;
  }

  /**
   * 上传图片到存储服务
   */
  private async uploadImagesToStorage(
    originalPath: string,
    paths: { original: string; webp: string; avif: string },
    originalMimeType: string,
    conversionResult: { webpPath?: string; avifPath?: string }
  ): Promise<{ original: string; webp?: string; avif?: string }> {
    const uploadPromises: Promise<string>[] = [];

    // 上传原始文件
    const originalBuffer = await this.tempFileService.readTempFile(originalPath);
    uploadPromises.push(
      this.storageService.upload(paths.original, originalBuffer, originalMimeType)
    );

    // 上传 WebP 文件
    if (conversionResult.webpPath) {
      const webpBuffer = await this.tempFileService.readTempFile(conversionResult.webpPath);
      uploadPromises.push(
        this.storageService.upload(paths.webp, webpBuffer, 'image/webp')
      );
    }

    // 上传 AVIF 文件
    if (conversionResult.avifPath) {
      const avifBuffer = await this.tempFileService.readTempFile(conversionResult.avifPath);
      uploadPromises.push(
        this.storageService.upload(paths.avif, avifBuffer, 'image/avif')
      );
    }

    try {
      const [originalKey, webpKey, avifKey] = await Promise.all(uploadPromises);

      return {
        original: originalKey,
        webp: uploadPromises.length > 1 ? webpKey : undefined,
        avif: uploadPromises.length > 2 ? avifKey : undefined
      };
    } catch (error) {
      this.logger.error('上传文件到存储服务失败', error);

      // 回滚已上传的文件
      const uploadedKeys = [paths.original, paths.webp, paths.avif].filter(Boolean);
      try {
        await this.storageService.deleteMany(uploadedKeys);
      } catch (rollbackError) {
        this.logger.error('回滚上传文件失败', rollbackError);
      }

      throw error;
    }
  }
}