import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Album } from '../entities/album.entity';
import { AlbumRepository } from './album.repository';
import { SimpleCacheService } from '../../../common/cache';
import { TTL_CONFIGS, TTLUtils } from '../../../common/ttl/tls.config';

describe('AlbumRepository', () => {
  let repository: AlbumRepository;
  let albumRepository: Repository<Album>;
  let cacheService: SimpleCacheService;

  const mockAlbum = {
    id: '123456789',
    userId: 'user123',
    albumName: '测试相册',
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: jest.fn(),
    setCreatedAt: jest.fn(),
    setUpdatedAt: jest.fn(),
  } as any;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumRepository,
        {
          provide: getRepositoryToken(Album),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: SimpleCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    repository = module.get<AlbumRepository>(AlbumRepository);
    albumRepository = module.get<Repository<Album>>(getRepositoryToken(Album));
    cacheService = module.get<SimpleCacheService>(SimpleCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('应该从缓存返回相册', async () => {
      mockCacheService.get.mockResolvedValue(mockAlbum);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockAlbum);
      expect(cacheService.get).toHaveBeenCalledWith('repo:album:id:123456789');
      expect(albumRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('应该从数据库获取相册并缓存', async () => {
      mockCacheService.get.mockResolvedValue(null);
      jest.spyOn(albumRepository, 'findOneBy').mockResolvedValue(mockAlbum);

      const result = await repository.findById('123456789');

      expect(result).toEqual(mockAlbum);
      expect(cacheService.get).toHaveBeenCalledWith('repo:album:id:123456789');
      expect(albumRepository.findOneBy).toHaveBeenCalledWith({ id: '123456789' });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:album:id:123456789',
        mockAlbum,
        TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE)
      );
    });

    it('当相册不存在时应该返回null', async () => {
      mockCacheService.get.mockResolvedValue(null);
      jest.spyOn(albumRepository, 'findOneBy').mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findByIdAndUserId', () => {
    it('应该从缓存返回用户相册', async () => {
      mockCacheService.get.mockResolvedValue(mockAlbum);

      const result = await repository.findByIdAndUserId('123456789', 'user123');

      expect(result).toEqual(mockAlbum);
      expect(cacheService.get).toHaveBeenCalledWith('repo:album:user_album:user123:123456789');
      expect(albumRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('应该从数据库获取用户相册并缓存', async () => {
      mockCacheService.get.mockResolvedValue(null);
      jest.spyOn(albumRepository, 'findOneBy').mockResolvedValue(mockAlbum);

      const result = await repository.findByIdAndUserId('123456789', 'user123');

      expect(result).toEqual(mockAlbum);
      expect(cacheService.get).toHaveBeenCalledWith('repo:album:user_album:user123:123456789');
      expect(albumRepository.findOneBy).toHaveBeenCalledWith({ id: '123456789', userId: 'user123' });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:album:user_album:user123:123456789',
        mockAlbum,
        TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE)
      );
    });
  });

  describe('findByUserId', () => {
    it('应该返回分页的相册列表', async () => {
      const mockAlbums = [mockAlbum];
      jest.spyOn(albumRepository, 'count').mockResolvedValue(1);
      jest.spyOn(albumRepository, 'find').mockResolvedValue(mockAlbums);

      const result = await repository.findByUserId('user123', 1, 10);

      expect(result).toEqual({
        albums: mockAlbums,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(albumRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user123' },
      });
      expect(albumRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('应该支持搜索功能', async () => {
      const mockAlbums = [mockAlbum];
      jest.spyOn(albumRepository, 'count').mockResolvedValue(1);
      jest.spyOn(albumRepository, 'find').mockResolvedValue(mockAlbums);

      await repository.findByUserId('user123', 1, 10, '测试');

      expect(albumRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user123', albumName: Like('%测试%') },
      });
      expect(albumRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user123', albumName: Like('%测试%') },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('create', () => {
    it('应该创建新相册', async () => {
      const createData = {
        userId: 'user123',
        albumName: '新相册',
      };
      const expectedAlbum = { ...mockAlbum, ...createData };

      jest.spyOn(albumRepository, 'create').mockReturnValue(expectedAlbum as any);
      jest.spyOn(albumRepository, 'save').mockResolvedValue(expectedAlbum);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedAlbum);
      expect(albumRepository.create).toHaveBeenCalledWith(createData);
      expect(albumRepository.save).toHaveBeenCalledWith(expectedAlbum);
    });
  });

  describe('update', () => {
    it('应该更新相册并清理缓存', async () => {
      const updateData = { albumName: '更新的相册' };
      const expectedAlbum = { ...mockAlbum, ...updateData };

      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(mockAlbum);
      jest.spyOn(albumRepository, 'save').mockResolvedValue(expectedAlbum);
      jest.spyOn(repository, 'clearAlbumCache' as any).mockResolvedValue(undefined);

      const result = await repository.update('123456789', 'user123', updateData);

      expect(result).toEqual({
        oldAlbum: mockAlbum,
        updatedAlbum: expectedAlbum,
      });
      expect(albumRepository.save).toHaveBeenCalledWith(expectedAlbum);
      expect(repository['clearAlbumCache']).toHaveBeenCalledWith('123456789', 'user123');
    });

    it('当相册不存在时应该抛出错误', async () => {
      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(null);

      await expect(repository.update('nonexistent', 'user123', {}))
        .rejects.toThrow('相册不存在或无权限操作');
    });
  });

  describe('delete', () => {
    it('应该删除相册并清理缓存', async () => {
      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(mockAlbum);
      jest.spyOn(albumRepository, 'remove').mockResolvedValue(mockAlbum);
      jest.spyOn(repository, 'clearAlbumCache' as any).mockResolvedValue(undefined);

      await repository.delete('123456789', 'user123');

      expect(albumRepository.remove).toHaveBeenCalledWith(mockAlbum);
      expect(repository['clearAlbumCache']).toHaveBeenCalledWith('123456789', 'user123');
    });

    it('当相册不存在时应该抛出错误', async () => {
      jest.spyOn(repository, 'findByIdAndUserId').mockResolvedValue(null);

      await expect(repository.delete('nonexistent', 'user123'))
        .rejects.toThrow('相册不存在或无权限操作');
    });
  });

  describe('isAlbumBelongsToUser', () => {
    it('应该返回true当相册属于用户', async () => {
      jest.spyOn(albumRepository, 'findOneBy').mockResolvedValue(mockAlbum);

      const result = await repository.isAlbumBelongsToUser('123456789', 'user123');

      expect(result).toBe(true);
      expect(albumRepository.findOneBy).toHaveBeenCalledWith({
        id: '123456789',
        userId: 'user123',
      });
    });

    it('应该返回false当相册不属于用户', async () => {
      jest.spyOn(albumRepository, 'findOneBy').mockResolvedValue(null);

      const result = await repository.isAlbumBelongsToUser('123456789', 'otheruser');

      expect(result).toBe(false);
    });
  });
});