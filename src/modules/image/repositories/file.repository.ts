import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../entities/file.entity';
import { SimpleCacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils, NULL_CACHE_VALUES } from '../../../cache';

@Injectable()
export class FileRepository {
  private readonly logger = new Logger(FileRepository.name);
  private readonly CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE); // 2小时缓存
  private readonly NULL_CACHE_TTL = TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE); // 5分钟缓存空值

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly cacheService: SimpleCacheService,
  ) {}

  /**
   * 根据ID查找文件（带缓存，支持缓存穿透防护）
   */
  async findById(id: string): Promise<File | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKey('file', 'id', id);

      // 尝试从缓存获取
      const cachedFile = await this.cacheService.get<File>(cacheKey);
      if (cachedFile !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedFile)) {
          this.logger.debug(`从缓存获取文件空值标记（缓存穿透防护）: ${id}`);
          return null;
        }
        this.logger.debug(`从缓存获取文件: ${id}`);
        return cachedFile;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取文件: ${id}`);
      const file = await this.fileRepository.findOneBy({ id });

      // 缓存结果（无论是否存在都缓存）
      if (file) {
        await this.cacheService.set(cacheKey, file, this.CACHE_TTL);
        this.logger.debug(`缓存文件数据: ${id}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透
        const nullMarker = TTLUtils.toCacheableNullValue<File>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存文件空值标记（缓存穿透防护）: ${id}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return file;
    } catch (error) {
      this.logger.error(`根据ID查找文件失败: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据哈希值查找文件（带缓存，用于去重，支持缓存穿透防护）
   */
  async findByHash(hash: string): Promise<File | null> {
    try {
      const cacheKey = CacheKeyUtils.buildRepositoryKey('file', 'hash', hash);

      // 尝试从缓存获取
      const cachedFile = await this.cacheService.get<File>(cacheKey);
      if (cachedFile !== undefined) {
        // 检查是否为缓存的空值标记
        if (TTLUtils.isNullCacheValue(cachedFile)) {
          this.logger.debug(`从缓存获取文件哈希空值标记（缓存穿透防护）: ${hash}`);
          return null;
        }
        this.logger.debug(`从缓存获取文件（哈希）: ${hash}`);
        return cachedFile;
      }

      // 缓存未命中，从数据库获取
      this.logger.debug(`从数据库获取文件（哈希）: ${hash}`);
      const file = await this.fileRepository.findOneBy({ hash });

      // 缓存结果（无论是否存在都缓存）
      if (file) {
        await this.cacheService.set(cacheKey, file, this.CACHE_TTL);
        this.logger.debug(`缓存文件哈希数据: ${hash}, TTL: ${this.CACHE_TTL}秒`);
      } else {
        // 缓存空值，防止缓存穿透和重复的文件不存在查询
        const nullMarker = TTLUtils.toCacheableNullValue<File>();
        await this.cacheService.set(cacheKey, nullMarker, this.NULL_CACHE_TTL);
        this.logger.debug(`缓存文件哈希空值标记（缓存穿透防护）: ${hash}, TTL: ${this.NULL_CACHE_TTL}秒`);
      }

      return file;
    } catch (error) {
      this.logger.error(`根据哈希值查找文件失败: ${hash}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建文件记录
   */
  async create(fileData: Partial<File>): Promise<File> {
    try {
      const file = this.fileRepository.create(fileData);
      const savedFile = await this.fileRepository.save(file);

      // 清理哈希缓存，防止创建重复文件时的缓存冲突
      if (savedFile.hash) {
        const hashCacheKey = CacheKeyUtils.buildRepositoryKey('file', 'hash', savedFile.hash);
        await this.cacheService.delete(hashCacheKey);
        this.logger.debug(`清理文件哈希缓存: ${savedFile.hash}`);
      }

      this.logger.log(`创建文件记录成功: ${savedFile.id}, 哈希: ${savedFile.hash}`);
      return savedFile;
    } catch (error) {
      this.logger.error(`创建文件记录失败: ${fileData.hash}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除文件记录（自动清理缓存）
   */
  async delete(id: string): Promise<void> {
    try {
      const file = await this.findById(id);
      if (!file) {
        throw new Error('文件不存在');
      }

      await this.fileRepository.remove(file);

      // 清理相关缓存
      await this.clearFileCache(id, file.hash);

      this.logger.log(`删除文件记录成功: ${id}`);
    } catch (error) {
      this.logger.error(`删除文件记录失败: id=${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据ID删除文件记录（不预先查询）
   */
  async deleteById(id: string): Promise<File | null> {
    try {
      const file = await this.findById(id);
      if (!file) {
        return null;
      }

      await this.fileRepository.remove(file);

      // 清理相关缓存
      await this.clearFileCache(id, file.hash);

      this.logger.log(`根据ID删除文件记录成功: ${id}`);
      return file;
    } catch (error) {
      this.logger.error(`根据ID删除文件记录失败: id=${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 统计指定哈希的文件数量
   */
  async countByHash(hash: string): Promise<number> {
    try {
      return await this.fileRepository.count({
        where: { hash },
      });
    } catch (error) {
      this.logger.error(`统计哈希文件数量失败: hash=${hash}`, error.stack);
      throw error;
    }
  }

  /**
   * 清理文件相关缓存
   */
  private async clearFileCache(fileId: string, hash: string): Promise<void> {
    try {
      // 清理文件ID缓存
      const fileIdCacheKey = CacheKeyUtils.buildRepositoryKey('file', 'id', fileId);
      await this.cacheService.delete(fileIdCacheKey);

      // 清理文件哈希缓存
      if (hash) {
        const hashCacheKey = CacheKeyUtils.buildRepositoryKey('file', 'hash', hash);
        await this.cacheService.delete(hashCacheKey);
      }

      this.logger.debug(`清理文件缓存: fileId=${fileId}, hash=${hash}`);
    } catch (error) {
      this.logger.warn(`清理文件缓存失败: fileId=${fileId}, hash=${hash}`, error.stack);
      // 缓存清理失败不应影响主要功能
    }
  }
}