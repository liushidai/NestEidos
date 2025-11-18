import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Album } from './entities/album.entity';
import { AlbumRepository } from './repositories/album.repository';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';

@Injectable()
export class AlbumService {
  private readonly logger = new Logger(AlbumService.name);

  constructor(private readonly albumRepository: AlbumRepository) {}

  /**
   * 创建相册
   */
  async create(createAlbumDto: CreateAlbumDto, userId: string): Promise<Album> {
    this.logger.debug(
      `创建相册: ${createAlbumDto.albumName}, userId: ${userId}`,
    );

    return await this.albumRepository.create({
      ...createAlbumDto,
      userId,
    });
  }

  /**
   * 根据ID查找相册
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findById(id: string): Promise<Album | null> {
    this.logger.debug(`查找相册: ${id}`);
    return await this.albumRepository.findById(id);
  }

  /**
   * 根据用户ID和相册ID查找相册（确保是用户自己的相册）
   * 委托给Repository处理，Repository层负责缓存管理
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Album | null> {
    this.logger.debug(`查找用户相册: albumId=${id}, userId=${userId}`);
    return await this.albumRepository.findByIdAndUserId(id, userId);
  }

  /**
   * 分页查询用户的相册
   * 委托给Repository处理，Repository层决定是否使用缓存
   */
  async findByUserId(
    userId: string,
    queryDto: QueryAlbumDto,
  ): Promise<{
    albums: Album[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = queryDto;

    // 验证分页参数
    const validatedPage = Number.parseInt(page.toString(), 10);
    const validatedLimit = Number.parseInt(limit.toString(), 10);

    if (validatedPage < 1 || validatedLimit < 1 || validatedLimit > 100) {
      throw new BadRequestException('分页参数无效');
    }

    this.logger.debug(
      `分页查询用户相册: userId=${userId}, page=${validatedPage}, limit=${validatedLimit}, search=${search}`,
    );

    return await this.albumRepository.findByUserId(
      userId,
      validatedPage,
      validatedLimit,
      search,
    );
  }

  /**
   * 更新相册
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async update(
    id: string,
    userId: string,
    updateAlbumDto: UpdateAlbumDto,
  ): Promise<Album> {
    this.logger.debug(`更新相册: albumId=${id}, userId=${userId}`);

    try {
      const { updatedAlbum } = await this.albumRepository.update(
        id,
        userId,
        updateAlbumDto,
      );
      return updatedAlbum;
    } catch (error) {
      if (error.message === '相册不存在或无权限操作') {
        throw new NotFoundException('相册不存在或无权限操作');
      }
      throw error;
    }
  }

  /**
   * 删除相册（硬删除）
   * 注意：删除相册时，需要将关联的图片的 album_id 置为 0
   * 委托给Repository处理，Repository层负责缓存清理
   */
  async delete(id: string, userId: string): Promise<void> {
    this.logger.debug(`删除相册: albumId=${id}, userId=${userId}`);

    try {
      await this.albumRepository.delete(id, userId);

      // TODO: 这里需要在后续实现中，删除相册时将关联图片的 album_id 置为 0
      // 目前先删除相册
    } catch (error) {
      if (error.message === '相册不存在或无权限操作') {
        throw new NotFoundException('相册不存在或无权限操作');
      }
      throw error;
    }
  }

  /**
   * 检查相册是否属于指定用户
   * 委托给Repository处理，Repository层负责实时查询
   */
  async isAlbumBelongsToUser(
    albumId: string,
    userId: string,
  ): Promise<boolean> {
    this.logger.debug(`检查相册归属: albumId=${albumId}, userId=${userId}`);
    return await this.albumRepository.isAlbumBelongsToUser(albumId, userId);
  }
}
