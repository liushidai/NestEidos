import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Album } from '../entities/album.entity';
import { SimpleCacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils, NULL_CACHE_VALUES } from '../../../cache';

@Injectable()
export class AlbumRepository {
  private readonly logger = new Logger(AlbumRepository.name);
  private readonly CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE); // 2小时缓存
  private readonly NULL_CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE); // 5分钟缓存空值

  constructor(
    @InjectRepository(Album)
    private readonly albumRepository: Repository<Album>,
    private readonly cacheService: SimpleCacheService,
  ) {}

  /**
   * 根据ID查找相册（带缓存，支持缓存穿透防护）
   */
  async findById(id: string): Promise<Album | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKey('album', 'id', id);

      // 尝试从缓存获取
      const cachedAlbum = await this.cacheService.get<Album>(cacheKey);
      if (cachedAlbum !== null && cachedAlbum !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedAlbum)) {
          this.logger.debug(`从缓存获取空值标记（缓存穿透防护）: ${id}`);
          return null;
        }
        this.logger.debug(`从缓存获取相册: ${id}`);
        return cachedAlbum;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取相册: ${id}`);
      const album = await this.albumRepository.findOneBy({ id });

      // 缓存结果（无论是否存在都缓存）
      if (album) {
        await this.cacheService.set(cacheKey, album, this.CACHE_TTL);
        this.logger.debug(`缓存相册数据: ${id}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透
        const nullMarker = TTLUtils.toCacheableNullValue<Album>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存空值标记（缓存穿透防护）: ${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return album;
    } catch (error) {
      this.logger.error(`根据ID查找相册失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据用户ID和相册ID查找相册（确保是用户自己的相册，带缓存穿透防护）
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Album | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKey('album', 'user_album', `${userId}:${id}`);

      // 尝试从缓存获取
      const cachedAlbum = await this.cacheService.get<Album>(cacheKey);
      if (cachedAlbum !== null && cachedAlbum !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedAlbum)) {
          this.logger.debug(`从缓存获取用户相册空值标记（缓存穿透防护）: userId=${userId}, albumId=${id}`);
          return null;
        }
        this.logger.debug(`从缓存获取用户相册: userId=${userId}, albumId=${id}`);
        return cachedAlbum;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取用户相册: userId=${userId}, albumId=${id}`);
      const album = await this.albumRepository.findOneBy({ id, userId });

      // 缓存结果（无论是否存在都缓存）
      if (album) {
        await this.cacheService.set(cacheKey, album, this.CACHE_TTL);
        this.logger.debug(`缓存用户相册数据: userId=${userId}, albumId=${id}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透
        const nullMarker = TTLUtils.toCacheableNullValue<Album>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存用户相册空值标记（缓存穿透防护）: userId=${userId}, albumId=${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return album;
    } catch (error) {
      this.logger.error(`根据用户ID和相册ID查找相册失败: userId=${userId}, albumId=${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 分页查询用户的相册（不使用缓存，因为分页数据变化频繁）
   */
  async findByUserId(userId: string, page: number, limit: number, search?: string): Promise<{
    albums: Album[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      // 构建查询条件
      const where: FindOptionsWhere<Album> = { userId };
      if (search) {
        where.albumName = Like(`%${search}%`);
      }

      // 查询总数
      const total = await this.albumRepository.count({ where });

      // 查询数据
      const albums = await this.albumRepository.find({
        where,
        order: {
          createdAt: 'DESC',
        },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      this.logger.debug(`分页查询用户相册: userId=${userId}, page=${page}, limit=${limit}, total=${total}`);

      return {
        albums,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`分页查询用户相册失败: userId=${userId}, page=${page}, limit=${limit}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建相册
   */
  async create(albumData: Partial<Album>): Promise<Album> {
    try {
      const album = this.albumRepository.create(albumData);
      const savedAlbum = await this.albumRepository.save(album);

      this.logger.log(`创建相册成功: ${savedAlbum.albumName} (userId: ${savedAlbum.userId})`);
      return savedAlbum;
    } catch (error) {
      this.logger.error(`创建相册失败: ${albumData.albumName}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新相册（自动清理缓存）
   */
  async update(id: string, userId: string, albumData: Partial<Album>): Promise<{ oldAlbum: Album | null; updatedAlbum: Album }> {
    try {
      // 先查询原始数据
      const oldAlbum = await this.findByIdAndUserId(id, userId);
      if (!oldAlbum) {
        throw new Error('相册不存在或无权限操作');
      }

      // 更新数据
      const updatedData = { ...oldAlbum, ...albumData };
      const updatedAlbum = await this.albumRepository.save(updatedData);

      // 清理相关缓存
      await this.clearAlbumCache(id, userId);

      this.logger.log(`更新相册成功: ${updatedAlbum.albumName} (id: ${id})`);
      return { oldAlbum, updatedAlbum };
    } catch (error) {
      this.logger.error(`更新相册失败: id=${id}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除相册（自动清理缓存）
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const album = await this.findByIdAndUserId(id, userId);
      if (!album) {
        throw new Error('相册不存在或无权限操作');
      }

      await this.albumRepository.remove(album);

      // 清理相关缓存
      await this.clearAlbumCache(id, userId);

      this.logger.log(`删除相册成功: ${album.albumName} (id: ${id})`);
    } catch (error) {
      this.logger.error(`删除相册失败: id=${id}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查相册是否属于指定用户（实时查询，不使用缓存）
   */
  async isAlbumBelongsToUser(albumId: string, userId: string): Promise<boolean> {
    try {
      const album = await this.albumRepository.findOneBy({ id: albumId, userId });
      return !!album;
    } catch (error) {
      this.logger.error(`检查相册归属失败: albumId=${albumId}, userId=${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * 清理相册相关缓存
   */
  private async clearAlbumCache(albumId: string, userId: string): Promise<void> {
    try {
      // 清理相册ID缓存
      const albumIdCacheKey = CacheKeyUtils.buildRepositoryKey('album', 'id', albumId);
      await this.cacheService.delete(albumIdCacheKey);

      // 清理用户相册缓存
      const userAlbumCacheKey = CacheKeyUtils.buildRepositoryKey('album', 'user_album', `${userId}:${albumId}`);
      await this.cacheService.delete(userAlbumCacheKey);

      this.logger.debug(`清理相册缓存: albumId=${albumId}, userId=${userId}`);
    } catch (error) {
      this.logger.warn(`清理相册缓存失败: albumId=${albumId}, userId=${userId}`, error.stack);
      // 缓存清理失败不应影响主要功能
    }
  }
}