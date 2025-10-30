import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Album } from './entities/album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(Album)
    private albumRepository: Repository<Album>,
  ) {}

  /**
   * 创建相册
   */
  async create(createAlbumDto: CreateAlbumDto, userId: string): Promise<Album> {
    const album = this.albumRepository.create({
      ...createAlbumDto,
      userId,
    });

    return this.albumRepository.save(album);
  }

  /**
   * 根据ID查找相册
   */
  async findById(id: string): Promise<Album | null> {
    return this.albumRepository.findOneBy({ id });
  }

  /**
   * 根据用户ID和相册ID查找相册（确保是用户自己的相册）
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Album | null> {
    return this.albumRepository.findOneBy({ id, userId });
  }

  /**
   * 分页查询用户的相册
   */
  async findByUserId(userId: string, queryDto: QueryAlbumDto): Promise<{
    albums: Album[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = queryDto;
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

    return {
      albums,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 更新相册
   */
  async update(id: string, userId: string, updateAlbumDto: UpdateAlbumDto): Promise<Album> {
    const album = await this.findByIdAndUserId(id, userId);
    if (!album) {
      throw new NotFoundException('相册不存在或无权限操作');
    }

    if (updateAlbumDto.albumName) {
      album.albumName = updateAlbumDto.albumName;
    }

    return this.albumRepository.save(album);
  }

  /**
   * 删除相册（软删除或硬删除，这里使用硬删除）
   * 注意：删除相册时，需要将关联的图片的 album_id 置为 0
   */
  async delete(id: string, userId: string): Promise<void> {
    const album = await this.findByIdAndUserId(id, userId);
    if (!album) {
      throw new NotFoundException('相册不存在或无权限操作');
    }

    // TODO: 这里需要在后续实现中，删除相册时将关联图片的 album_id 置为 0
    // 目前先删除相册
    await this.albumRepository.remove(album);
  }

  /**
   * 检查相册是否属于指定用户
   */
  async isAlbumBelongsToUser(albumId: string, userId: string): Promise<boolean> {
    const album = await this.findByIdAndUserId(albumId, userId);
    return !!album;
  }
}