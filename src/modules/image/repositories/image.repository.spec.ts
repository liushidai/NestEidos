import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from '../entities/image.entity';
import { File } from '../entities/file.entity';
import { ImageRepository } from './image.repository';
import { SimpleCacheService, TTL_CONFIGS, TTLUtils } from '@/cache';

describe('ImageRepository', () => {
  let repository: ImageRepository;
  let imageRepository: Repository<Image>;
  let fileRepository: Repository<File>;
  let cacheService: SimpleCacheService;

  const mockImage: Image = {
    id: '123456789',
    userId: 'user123',
    albumId: 'album123',
    title: '测试图片',
    originalName: 'test.jpg',
    fileId: 'file123',
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: jest.fn(),
    setCreatedAt: jest.fn(),
    setUpdatedAt: jest.fn(),
  } as any;

  const mockFile: File = {
    id: 'file123',
    hash: 'abc123',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    originalKey: 'images/test.jpg',
    webpKey: 'images/test.webp',
    avifKey: 'images/test.avif',
    hasWebp: true,
    hasAvif: true,
    convertWebpParamId: null,
    convertAvifParamId: null,
    createdAt: new Date(),
  } as any;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageRepository,
        {
          provide: getRepositoryToken(Image),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(File),
          useValue: {
            findOneBy: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: SimpleCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    repository = module.get<ImageRepository>(ImageRepository);
    imageRepository = module.get<Repository<Image>>(getRepositoryToken(Image));
    fileRepository = module.get<Repository<File>>(getRepositoryToken(File));
    cacheService = module.get<SimpleCacheService>(SimpleCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('应该从缓存返回图片', async () => {
      mockCacheService.get.mockResolvedValue(mockImage);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockImage);
      expect(cacheService.get).toHaveBeenCalledWith('repo:image:id:123456789');
      expect(imageRepository.findOne).not.toHaveBeenCalled();
    });

    it('应该从数据库获取图片并缓存', async () => {
      mockCacheService.get.mockResolvedValue(null);
      jest.spyOn(imageRepository, 'findOne').mockResolvedValue(mockImage);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockImage);
      expect(cacheService.get).toHaveBeenCalledWith('repo:image:id:123456789');
      expect(imageRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123456789' },
        relations: ['file'],
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:image:id:123456789',
        mockImage,
        TTLUtils.toSeconds(TTL_CONFIGS.MEDIUM_CACHE)
      );
    });

    it('当图片不存在时应该返回null', async () => {
      mockCacheService.get.mockResolvedValue(null);
      jest.spyOn(imageRepository, 'findOne').mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findByIdAndUserId', () => {
    it('应该从缓存返回用户图片', async () => {
      mockCacheService.get.mockResolvedValue(mockImage);

      const result = await repository.findByIdAndUserId('123456789', 'user123');

      expect(result).toEqual(mockImage);
      expect(cacheService.get).toHaveBeenCalledWith('repo:image:user_image:user123:123456789');
      expect(imageRepository.findOne).not.toHaveBeenCalled();
    });

    it('应该从数据库获取用户图片并缓存', async () => {
      mockCacheService.get.mockResolvedValue(null);
      jest.spyOn(imageRepository, 'findOne').mockResolvedValue(mockImage);

      const result = await repository.findByIdAndUserId('123456789', 'user123');

      expect(result).toEqual(mockImage);
      expect(cacheService.get).toHaveBeenCalledWith('repo:image:user_image:user123:123456789');
      expect(imageRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123456789', userId: 'user123' },
        relations: ['file'],
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:image:user_image:user123:123456789',
        mockImage,
        TTLUtils.toSeconds(TTL_CONFIGS.MEDIUM_CACHE)
      );
    });
  });

  describe('findByUserId', () => {
    it('应该返回分页的图片列表', async () => {
      const mockImages = [mockImage];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockImages, 1]),
      };

      jest.spyOn(imageRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await repository.findByUserId('user123', 1, 10);

      expect(result).toEqual({
        images: mockImages,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('image.userId = :userId', { userId: 'user123' });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('应该支持搜索和筛选功能', async () => {
      const mockImages = [mockImage];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockImages, 1]),
      };

      jest.spyOn(imageRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await repository.findByUserId('user123', 1, 10, '测试', 'album123', ['image/jpeg']);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('image.title LIKE :search', { search: '%测试%' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('image.albumId = :albumId', { albumId: 'album123' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('file.mimeType IN (:...mimeType)', { mimeType: ['image/jpeg'] });
    });
  });

  describe('create', () => {
    it('应该创建新图片记录', async () => {
      const createData = {
        userId: 'user123',
        title: '新图片',
      };
      const expectedImage = { ...mockImage, ...createData };

      jest.spyOn(imageRepository, 'create').mockReturnValue(expectedImage as any);
      jest.spyOn(imageRepository, 'save').mockResolvedValue(expectedImage);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedImage);
      expect(imageRepository.create).toHaveBeenCalledWith(createData);
      expect(imageRepository.save).toHaveBeenCalledWith(expectedImage);
    });
  });

  describe('update', () => {
    it('应该更新图片并清理缓存', async () => {
      const updateData = { title: '更新的图片' };
      const expectedImage = { ...mockImage, ...updateData };

      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(mockImage);
      jest.spyOn(imageRepository, 'save').mockResolvedValue(expectedImage);
      jest.spyOn(repository, 'clearImageCache' as any).mockResolvedValue(undefined);

      const result = await repository.update('123456789', 'user123', updateData);

      expect(result).toEqual({
        oldImage: mockImage,
        updatedImage: expectedImage,
      });
      expect(imageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '更新的图片',
          updatedAt: expect.any(Date),
        })
      );
      expect(repository['clearImageCache']).toHaveBeenCalledWith('123456789', 'user123');
    });

    it('当图片不存在时应该抛出错误', async () => {
      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(null);

      await expect(repository.update('nonexistent', 'user123', {}))
        .rejects.toThrow('图片不存在或无权限操作');
    });
  });

  describe('delete', () => {
    it('应该删除图片并清理缓存', async () => {
      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(mockImage);
      jest.spyOn(imageRepository, 'remove').mockResolvedValue(mockImage);
      jest.spyOn(repository, 'clearImageCache' as any).mockResolvedValue(undefined);

      await repository.delete('123456789', 'user123');

      expect(imageRepository.remove).toHaveBeenCalledWith(mockImage);
      expect(repository['clearImageCache']).toHaveBeenCalledWith('123456789', 'user123');
    });

    it('当图片不存在时应该抛出错误', async () => {
      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(null);

      await expect(repository.delete('nonexistent', 'user123'))
        .rejects.toThrow('图片不存在或无权限操作');
    });
  });

  describe('isImageBelongsToUser', () => {
    it('应该返回true当图片属于用户', async () => {
      jest.spyOn(imageRepository, 'findOneBy').mockResolvedValue(mockImage);

      const result = await repository.isImageBelongsToUser('123456789', 'user123');

      expect(result).toBe(true);
      expect(imageRepository.findOneBy).toHaveBeenCalledWith({
        id: '123456789',
        userId: 'user123',
      });
    });

    it('应该返回false当图片不属于用户', async () => {
      jest.spyOn(imageRepository, 'findOneBy').mockResolvedValue(null);

      const result = await repository.isImageBelongsToUser('123456789', 'otheruser');

      expect(result).toBe(false);
    });
  });

  describe('countByFileId', () => {
    it('应该返回文件被引用的次数', async () => {
      jest.spyOn(imageRepository, 'count').mockResolvedValue(3);

      const result = await repository.countByFileId('file123');

      expect(result).toBe(3);
      expect(imageRepository.count).toHaveBeenCalledWith({
        where: { fileId: 'file123' },
      });
    });
  });

  describe('updateAlbumId', () => {
    it('应该批量更新图片的相册ID', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      jest.spyOn(imageRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await repository.updateAlbumId('oldAlbum', 'newAlbum');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Image);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ albumId: 'newAlbum' });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('albumId = :oldAlbumId', { oldAlbumId: 'oldAlbum' });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});