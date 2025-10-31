import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, FindOptionsWhere } from 'typeorm';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
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
import { ImageMimeType, getFileExtension } from '../../constants/mime-type.constant';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly secureIdUtil: SecureIdUtil;

  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
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

    try {
      // 1. 保存文件到临时位置
      tempFilePath = await this.tempFileService.saveTempFile(fileData);

      // 2. 计算文件哈希值
      const hash = await this.calculateFileHash(tempFilePath);

      // 3. 检查是否已存在相同哈希的文件（去重）
      let existingFile = await this.findFileByHash(hash);

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
        existingFile = this.fileRepository.create({
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

        existingFile = await this.fileRepository.save(existingFile);
        this.logger.log(`新文件上传成功: ${fileId}, 哈希: ${hash}`);
      } else {
        this.logger.log(`发现重复文件，复用已有文件记录: ${existingFile.id}, 哈希: ${hash}`);
        // 清理临时文件
        await this.tempFileService.deleteTempFile(tempFilePath);
      }

      // 9. 创建图片记录
      const image = this.imageRepository.create({
        id: imageId,
        userId,
        albumId: createImageDto.albumId || '0',
        title: createImageDto.title,
        originalName: fileData.originalname,
        fileId: existingFile.id,
        createdAt: now,
        updatedAt: now,
      });

      const savedImage = await this.imageRepository.save(image);
      this.logger.log(`图片记录创建成功: ${imageId}, 原始文件: ${fileData.originalname}`);

      return savedImage;

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
   */
  async findById(id: string): Promise<Image | null> {
    return this.imageRepository.findOne({
      where: { id },
      relations: ['file'],
    });
  }

  /**
   * 根据ID和用户ID查找图片
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Image | null> {
    return this.imageRepository.findOne({
      where: { id, userId },
      relations: ['file'],
    });
  }

  /**
   * 分页查询用户的图片
   */
  async findByUserId(userId: string, queryDto: QueryImageDto) {
    const { page = 1, limit = 10, search, albumId, mimeType } = queryDto;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: FindOptionsWhere<Image> = { userId };

    // 标题搜索
    if (search) {
      where.title = Like(`%${search}%`);
    }

    // 相册筛选
    if (albumId) {
      where.albumId = albumId;
    }

    // MIME类型筛选（现在通过file关联查询）
    const queryBuilder = this.imageRepository
      .createQueryBuilder('image')
      .leftJoinAndSelect('image.file', 'file')
      .where('image.userId = :userId', { userId })
      .skip(skip)
      .take(limit)
      .orderBy('image.createdAt', 'DESC');

    // 添加搜索条件
    if (search) {
      queryBuilder.andWhere('image.title LIKE :search', { search: `%${search}%` });
    }

    if (albumId) {
      queryBuilder.andWhere('image.albumId = :albumId', { albumId });
    }

    if (mimeType && mimeType.length > 0) {
      queryBuilder.andWhere('file.mimeType IN (:...mimeType)', { mimeType });
    }

    // 查询总数和数据
    const [images, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      images,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 更新图片信息
   */
  async update(id: string, userId: string, updateImageDto: UpdateImageDto): Promise<Image> {
    const image = await this.findByIdAndUserId(id, userId);
    if (!image) {
      throw new NotFoundException('图片不存在或无权限操作');
    }

    // 只允许更新title字段
    const updatedImage = {
      ...image,
      ...updateImageDto,
      updatedAt: new Date(),
    };

    return this.imageRepository.save(updatedImage);
  }

  /**
   * 删除图片
   */
  async delete(id: string, userId: string): Promise<void> {
    const image = await this.findByIdAndUserId(id, userId);
    if (!image) {
      throw new NotFoundException('图片不存在或无权限操作');
    }

    const fileId = image.fileId;

    // 删除图片记录
    await this.imageRepository.remove(image);

    // 检查是否还有其他图片引用这个文件
    const remainingImagesCount = await this.imageRepository.count({
      where: { fileId },
    });

    if (remainingImagesCount === 0) {
      // 没有其他图片引用，删除文件记录和物理文件
      const file = await this.fileRepository.findOneBy({ id: fileId });
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
        await this.fileRepository.remove(file);
        this.logger.log(`删除文件记录成功: ${fileId}`);
      }
    } else {
      this.logger.log(`文件仍被其他图片引用，仅删除图片记录: imageId=${id}, fileId=${fileId}`);
    }
  }

  /**
   * 检查图片是否属于用户
   */
  async isImageBelongsToUser(imageId: string, userId: string): Promise<boolean> {
    const image = await this.imageRepository.findOneBy({
      id: imageId,
      userId,
    });
    return !!image;
  }

  /**
   * 根据哈希值查找文件（用于去重）
   */
  async findFileByHash(hash: string): Promise<File | null> {
    return this.fileRepository.findOneBy({ hash });
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

    const extension = format ? getFileExtension(format as ImageMimeType) : 'jpg';

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