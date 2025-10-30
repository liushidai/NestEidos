import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, FindOptionsWhere } from 'typeorm';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';
import { SnowflakeUtil } from '../../utils/snowflake.util';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
  ) {}

  /**
   * 创建图片记录（暂时不实现实际的文件处理逻辑）
   */
  async create(createImageDto: CreateImageDto, userId: string, fileData?: Express.Multer.File): Promise<Image> {
    const snowflake = SnowflakeUtil.getInstance();
    const now = new Date();

    // 暂时不实现实际的文件处理逻辑，返回模拟数据
    const image = this.imageRepository.create({
      id: snowflake.nextId(),
      userId,
      albumId: createImageDto.albumId || '0',
      title: createImageDto.title,
      originalName: fileData?.originalname || 'temp.jpg',
      fileSize: fileData?.size || 0,
      mimeType: fileData?.mimetype || 'image/jpeg',
      width: 0, // 暂时设为0，后续实现图片处理时再设置
      height: 0, // 暂时设为0，后续实现图片处理时再设置
      hash: 'temp_hash_placeholder', // 暂时使用占位符
      originalKey: 'temp/original/temp.jpg', // 暂时使用占位符
      createdAt: now,
      updatedAt: now,
    });

    return this.imageRepository.save(image);
  }

  /**
   * 根据ID查找图片
   */
  async findById(id: string): Promise<Image | null> {
    return this.imageRepository.findOneBy({ id });
  }

  /**
   * 根据ID和用户ID查找图片
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Image | null> {
    return this.imageRepository.findOneBy({ id, userId });
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

    // MIME类型筛选
    if (mimeType && mimeType.length > 0) {
      where.mimeType = In(mimeType);
    }

    // 查询总数和数据
    const [images, total] = await this.imageRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

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

    await this.imageRepository.remove(image);
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
   * 根据哈希值查找图片（用于去重）
   */
  async findByHash(hash: string): Promise<Image | null> {
    return this.imageRepository.findOneBy({ hash });
  }
}