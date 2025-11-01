import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Image } from '../entities/image.entity';
import { CacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils, NULL_CACHE_VALUES } from '../../../cache';

@Injectable()
export class ImageRepository {
  private readonly logger = new Logger(ImageRepository.name);
  private readonly redisKeyPrefix: string;
  private readonly CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.MEDIUM_CACHE); // 30分钟缓存
  private readonly NULL_CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE); // 5分钟缓存空值

  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    // 使用配置中的 REDIS_KEY_PREFIX
    this.redisKeyPrefix = this.configService.get<string>('redis.keyPrefix') || 'nest_eidos:';
  }

  /**
   * 根据ID查找图片（带缓存，支持缓存穿透防护）
   */
  async findById(id: string): Promise<Image | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'image', 'id', id);

      // 尝试从缓存获取
      const cachedImage = await this.cacheService.get<Image>(cacheKey);
      if (cachedImage !== null && cachedImage !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedImage)) {
          this.logger.debug(`从缓存获取图片空值标记（缓存穿透防护）: ${id}`);
          return null;
        }
        this.logger.debug(`从缓存获取图片: ${id}`);
        return cachedImage;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取图片: ${id}`);
      const image = await this.imageRepository.findOne({
        where: { id },
        relations: ['user', 'album'],
      });

      // 缓存结果（无论是否存在都缓存）
      if (image) {
        await this.cacheService.set(cacheKey, image, this.CACHE_TTL);
        this.logger.debug(`缓存图片数据: ${id}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透
        const nullMarker = TTLUtils.toCacheableNullValue<Image>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存图片空值标记（缓存穿透防护）: ${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return image;
    } catch (error) {
      this.logger.error(`根据ID查找图片失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据ID和用户ID查找图片（带缓存，支持缓存穿透防护）
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Image | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'image', 'user_image', `${userId}:${id}`);

      // 尝试从缓存获取
      const cachedImage = await this.cacheService.get<Image>(cacheKey);
      if (cachedImage !== null && cachedImage !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedImage)) {
          this.logger.debug(`从缓存获取用户图片空值标记（缓存穿透防护）: userId=${userId}, imageId=${id}`);
          return null;
        }
        this.logger.debug(`从缓存获取用户图片: userId=${userId}, imageId=${id}`);
        return cachedImage;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取用户图片: userId=${userId}, imageId=${id}`);
      const image = await this.imageRepository.findOne({
        where: { id, userId },
        relations: ['user', 'album'],
      });

      // 缓存结果（无论是否存在都缓存）
      if (image) {
        await this.cacheService.set(cacheKey, image, this.CACHE_TTL);
        this.logger.debug(`缓存用户图片数据: userId=${userId}, imageId=${id}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透
        const nullMarker = TTLUtils.toCacheableNullValue<Image>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存用户图片空值标记（缓存穿透防护）: userId=${userId}, imageId=${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return image;
    } catch (error) {
      this.logger.error(`根据用户ID和图片ID查找图片失败: userId=${userId}, imageId=${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 分页查询用户的图片（不使用缓存，因为分页数据变化频繁）
   */
  async findByUserId(userId: string, page: number, limit: number, search?: string, albumId?: string, mimeType?: string[]): Promise<{
    images: Image[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // 构建查询条件
      const queryBuilder = this.imageRepository
        .createQueryBuilder('image')
        .leftJoinAndSelect('image.user', 'user')
        .leftJoinAndSelect('image.album', 'album')
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
        queryBuilder.andWhere('image.imageMimeType IN (:...mimeType)', { mimeType });
      }

      // 查询总数和数据
      const [images, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      this.logger.debug(`分页查询用户图片: userId=${userId}, page=${page}, limit=${limit}, total=${total}`);

      return {
        images,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`分页查询用户图片失败: userId=${userId}, page=${page}, limit=${limit}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建图片记录
   */
  async create(imageData: Partial<Image>): Promise<Image> {
    try {
      const image = this.imageRepository.create(imageData);
      const savedImage = await this.imageRepository.save(image);

      this.logger.log(`创建图片记录成功: ${savedImage.id} (userId: ${savedImage.userId})`);
      return savedImage;
    } catch (error) {
      this.logger.error(`创建图片记录失败: ${imageData.userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新图片信息（自动清理缓存）
   */
  async update(id: string, userId: string, imageData: Partial<Image>): Promise<{ oldImage: Image | null; updatedImage: Image }> {
    try {
      // 先查询原始数据
      const oldImage = await this.findByIdAndUserId(id, userId);
      if (!oldImage) {
        throw new Error('图片不存在或无权限操作');
      }

      // 更新数据
      const updatedData = { ...oldImage, ...imageData, updatedAt: new Date() };
      const updatedImage = await this.imageRepository.save(updatedData);

      // 清理相关缓存
      await this.clearImageCache(id, userId);

      this.logger.log(`更新图片成功: ${updatedImage.title} (id: ${id})`);
      return { oldImage, updatedImage };
    } catch (error) {
      this.logger.error(`更新图片失败: id=${id}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除图片（自动清理缓存）
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const image = await this.findByIdAndUserId(id, userId);
      if (!image) {
        throw new Error('图片不存在或无权限操作');
      }

      await this.imageRepository.remove(image);

      // 清理相关缓存
      await this.clearImageCache(id, userId);

      this.logger.log(`删除图片成功: ${image.title} (id: ${id})`);
    } catch (error) {
      this.logger.error(`删除图片失败: id=${id}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查图片是否属于指定用户（实时查询，不使用缓存）
   */
  async isImageBelongsToUser(imageId: string, userId: string): Promise<boolean> {
    try {
      const image = await this.imageRepository.findOneBy({
        id: imageId,
        userId,
      });
      return !!image;
    } catch (error) {
      this.logger.error(`检查图片归属失败: imageId=${imageId}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  
  /**
   * 批量更新图片的相册ID（用于相册删除时）
   */
  async updateAlbumId(oldAlbumId: string, newAlbumId: string = '0'): Promise<void> {
    try {
      await this.imageRepository
        .createQueryBuilder()
        .update(Image)
        .set({ albumId: newAlbumId })
        .where('albumId = :oldAlbumId', { oldAlbumId })
        .execute();

      this.logger.log(`批量更新图片相册ID成功: oldAlbumId=${oldAlbumId}, newAlbumId=${newAlbumId}`);
    } catch (error) {
      this.logger.error(`批量更新图片相册ID失败: oldAlbumId=${oldAlbumId}`, error.stack);
      throw error;
    }
  }

  /**
   * 清理图片相关缓存
   */
  private async clearImageCache(imageId: string, userId: string): Promise<void> {
    try {
      // 清理图片ID缓存
      const imageIdCacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'image', 'id', imageId);
      await this.cacheService.delete(imageIdCacheKey);

      // 清理用户图片缓存
      const userImageCacheKey = CacheKeyUtils.buildRepositoryKeyWithPrefix(this.redisKeyPrefix, 'image', 'user_image', `${userId}:${imageId}`);
      await this.cacheService.delete(userImageCacheKey);

      this.logger.debug(`清理图片缓存: imageId=${imageId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`清理图片缓存失败: imageId=${imageId}, userId=${userId}`, error.stack);
      // 缓存清理失败不应影响主要功能
    }
  }
}