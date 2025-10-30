import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlbumService } from './album.service';
import { Album } from './entities/album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';

describe('AlbumService', () => {
  let service: AlbumService;
  let repository: jest.Mocked<Repository<Album>>;

  const mockAlbum = {
    id: '1234567890123456789',
    userId: '1234567890123456788',
    albumName: '我的相册',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Album;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumService,
        {
          provide: getRepositoryToken(Album),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AlbumService>(AlbumService);
    repository = module.get(getRepositoryToken(Album)) as jest.Mocked<Repository<Album>>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAlbumDto: CreateAlbumDto = {
      albumName: '新相册',
    };
    const userId = '1234567890123456788';

    it('should successfully create an album', async () => {
      const albumToCreate = { ...createAlbumDto, userId };
      mockRepository.create.mockReturnValue(albumToCreate);
      mockRepository.save.mockResolvedValue(mockAlbum);

      const result = await service.create(createAlbumDto, userId);

      expect(mockRepository.create).toHaveBeenCalledWith(albumToCreate);
      expect(mockRepository.save).toHaveBeenCalledWith(albumToCreate);
      expect(result).toEqual(mockAlbum);
    });

    it('should throw error when repository fails to save', async () => {
      const error = new Error('Database error');
      mockRepository.create.mockReturnValue({ ...createAlbumDto, userId });
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(createAlbumDto, userId)).rejects.toThrow(error);
    });
  });

  describe('findById', () => {
    it('should return album if found', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);

      const result = await service.findById('1234567890123456789');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(result).toEqual(mockAlbum);
    });

    it('should return null if album not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return album if found for user', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);

      const result = await service.findByIdAndUserId('1234567890123456789', '1234567890123456788');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: '1234567890123456789',
        userId: '1234567890123456788',
      });
      expect(result).toEqual(mockAlbum);
    });

    it('should return null if album not found for user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findByIdAndUserId('1234567890123456789', 'wronguser');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: '1234567890123456789',
        userId: 'wronguser',
      });
      expect(result).toBeNull();
    });

    it('should return null if album does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findByIdAndUserId('nonexistent', '1234567890123456788');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: 'nonexistent',
        userId: '1234567890123456788',
      });
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    const userId = '1234567890123456788';

    it('should return paginated albums for user', async () => {
      const queryDto: QueryAlbumDto = { page: 1, limit: 10 };
      const mockAlbums = [mockAlbum];
      const expectedWhere: FindOptionsWhere<Album> = { userId };

      mockRepository.count.mockResolvedValue(1);
      mockRepository.find.mockResolvedValue(mockAlbums);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expectedWhere,
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        albums: mockAlbums,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return paginated albums with search', async () => {
      const queryDto: QueryAlbumDto = { page: 2, limit: 5, search: '相册' };
      const mockAlbums = [mockAlbum];
      const expectedWhere: FindOptionsWhere<Album> = {
        userId,
        albumName: Like('%相册%'),
      };

      mockRepository.count.mockResolvedValue(1);
      mockRepository.find.mockResolvedValue(mockAlbums);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expectedWhere,
        order: { createdAt: 'DESC' },
        skip: 5,
        take: 5,
      });
      expect(result).toEqual({
        albums: mockAlbums,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
    });

    it('should use default pagination values', async () => {
      const queryDto: QueryAlbumDto = {};
      const expectedWhere: FindOptionsWhere<Album> = { userId };

      mockRepository.count.mockResolvedValue(0);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: expectedWhere,
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        albums: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should calculate totalPages correctly', async () => {
      const queryDto: QueryAlbumDto = { page: 1, limit: 3 };
      mockRepository.count.mockResolvedValue(10); // 10 条记录，每页 3 条
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.totalPages).toBe(4); // Math.ceil(10 / 3) = 4
    });

    it('should handle empty search results', async () => {
      const queryDto: QueryAlbumDto = { search: '不存在的相册' };
      const expectedWhere: FindOptionsWhere<Album> = {
        userId,
        albumName: Like('%不存在的相册%'),
      };

      mockRepository.count.mockResolvedValue(0);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId, queryDto);

      expect(result).toEqual({
        albums: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('update', () => {
    const updateAlbumDto: UpdateAlbumDto = { albumName: '更新后的相册名' };
    const userId = '1234567890123456788';
    const albumId = '1234567890123456789';

    it('should successfully update album', async () => {
      const updatedAlbum = { ...mockAlbum, albumName: '更新后的相册名' };
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);
      mockRepository.save.mockResolvedValue(updatedAlbum);

      const result = await service.update(albumId, userId, updateAlbumDto);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: albumId,
        userId,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          albumName: '更新后的相册名',
        }),
      );
      expect(result).toEqual(updatedAlbum);
    });

    it('should throw NotFoundException if album does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(albumId, userId, updateAlbumDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if album does not belong to user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(albumId, 'wronguser', updateAlbumDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update only albumName if provided', async () => {
      const updateAlbumDto: UpdateAlbumDto = { albumName: '新名称' };
      const updatedAlbum = { ...mockAlbum, albumName: '新名称' };
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);
      mockRepository.save.mockResolvedValue(updatedAlbum);

      await service.update(albumId, userId, updateAlbumDto);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          albumName: '新名称',
        }),
      );
    });

    it('should not update if albumName is not provided', async () => {
      const updateAlbumDto: UpdateAlbumDto = {};
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);
      mockRepository.save.mockResolvedValue(mockAlbum);

      await service.update(albumId, userId, updateAlbumDto);

      expect(mockRepository.save).toHaveBeenCalledWith(mockAlbum);
    });
  });

  describe('delete', () => {
    const userId = '1234567890123456788';
    const albumId = '1234567890123456789';

    it('should successfully delete album', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);
      mockRepository.remove.mockResolvedValue(undefined);

      await service.delete(albumId, userId);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: albumId,
        userId,
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockAlbum);
    });

    it('should throw NotFoundException if album does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.delete(albumId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if album does not belong to user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.delete(albumId, 'wronguser')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database error during deletion', async () => {
      const error = new Error('Database error');
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);
      mockRepository.remove.mockRejectedValue(error);

      await expect(service.delete(albumId, userId)).rejects.toThrow(error);
    });
  });

  describe('isAlbumBelongsToUser', () => {
    it('should return true if album belongs to user', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockAlbum);

      const result = await service.isAlbumBelongsToUser(
        '1234567890123456789',
        '1234567890123456788',
      );

      expect(result).toBe(true);
    });

    it('should return false if album does not belong to user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.isAlbumBelongsToUser(
        '1234567890123456789',
        'wronguser',
      );

      expect(result).toBe(false);
    });

    it('should return false if album does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.isAlbumBelongsToUser(
        'nonexistent',
        '1234567890123456788',
      );

      expect(result).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty albumName in create', async () => {
      const createAlbumDto: CreateAlbumDto = { albumName: '' };
      const userId = '1234567890123456788';
      const expectedAlbum = { ...createAlbumDto, userId };

      mockRepository.create.mockReturnValue(expectedAlbum);
      mockRepository.save.mockResolvedValue(expectedAlbum);

      const result = await service.create(createAlbumDto, userId);

      expect(result).toEqual(expectedAlbum);
    });

    it('should handle very long albumName', async () => {
      const longName = 'a'.repeat(200);
      const createAlbumDto: CreateAlbumDto = { albumName: longName };
      const userId = '1234567890123456788';
      const albumToCreate = { ...createAlbumDto, userId };

      mockRepository.create.mockReturnValue(albumToCreate);
      mockRepository.save.mockResolvedValue({ ...mockAlbum, albumName: longName });

      const result = await service.create(createAlbumDto, userId);

      expect(result.albumName).toBe(longName);
    });

    it('should handle special characters in search', async () => {
      const queryDto: QueryAlbumDto = { search: '相册!@#$%^&*()' };
      const userId = '1234567890123456788';
      const expectedWhere: FindOptionsWhere<Album> = {
        userId,
        albumName: Like('%相册!@#$%^&*()%'),
      };

      mockRepository.count.mockResolvedValue(0);
      mockRepository.find.mockResolvedValue([]);

      await service.findByUserId(userId, queryDto);

      expect(mockRepository.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('should handle zero page number', async () => {
      const queryDto: QueryAlbumDto = { page: 0, limit: 10 };
      const userId = '1234567890123456788';

      mockRepository.count.mockResolvedValue(0);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.page).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle negative page number', async () => {
      const queryDto: QueryAlbumDto = { page: -1, limit: 10 };
      const userId = '1234567890123456788';

      mockRepository.count.mockResolvedValue(0);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.page).toBe(-1);
      expect(result.totalPages).toBe(0);
    });

    it('should handle zero limit', async () => {
      const queryDto: QueryAlbumDto = { limit: 0 };
      const userId = '1234567890123456788';

      mockRepository.count.mockResolvedValue(5);
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.limit).toBe(0);
      expect(result.totalPages).toBe(Infinity); // Math.ceil(5 / 0) = Infinity
    });
  });

  describe('isAlbumBelongsToUser 辅助方法详细测试', () => {
    it('should return true for valid album ownership', async () => {
      const albumId = '1234567890123456789';
      const userId = '1234567890123456788';

      mockRepository.findOneBy.mockResolvedValue(mockAlbum);

      const result = await service.isAlbumBelongsToUser(albumId, userId);

      expect(result).toBe(true);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: albumId,
        userId: userId,
      });
    });

    it('should return false when album belongs to different user', async () => {
      const albumId = '1234567890123456789';
      const wrongUserId = 'wrong-user-id';

      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.isAlbumBelongsToUser(albumId, wrongUserId);

      expect(result).toBe(false);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: albumId,
        userId: wrongUserId,
      });
    });

    it('should return false when album does not exist', async () => {
      const nonExistentAlbumId = 'non-existent-id';
      const userId = '1234567890123456788';

      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.isAlbumBelongsToUser(nonExistentAlbumId, userId);

      expect(result).toBe(false);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: nonExistentAlbumId,
        userId: userId,
      });
    });

    it('should handle database errors gracefully', async () => {
      const albumId = '1234567890123456789';
      const userId = '1234567890123456788';
      const dbError = new Error('Database connection failed');

      mockRepository.findOneBy.mockRejectedValue(dbError);

      await expect(service.isAlbumBelongsToUser(albumId, userId)).rejects.toThrow(dbError);
    });
  });

  describe('Performance and integration', () => {
    it('should handle large result sets efficiently', async () => {
      const queryDto: QueryAlbumDto = { limit: 100 };
      const userId = '1234567890123456788';
      const mockAlbums = Array(100).fill(null).map((_, index) => ({
        ...mockAlbum,
        id: `album-${index}`,
        albumName: `相册 ${index}`,
      }));

      mockRepository.count.mockResolvedValue(100);
      mockRepository.find.mockResolvedValue(mockAlbums);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.albums).toHaveLength(100);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(1);
    });

    it('should maintain consistent ordering', async () => {
      const queryDto: QueryAlbumDto = { limit: 5 };
      const userId = '1234567890123456788';
      const mockAlbums = [
        { ...mockAlbum, id: '3', createdAt: new Date('2024-01-03T00:00:00.000Z') },
        { ...mockAlbum, id: '2', createdAt: new Date('2024-01-02T00:00:00.000Z') },
        { ...mockAlbum, id: '1', createdAt: new Date('2024-01-01T00:00:00.000Z') },
      ];

      mockRepository.count.mockResolvedValue(3);
      mockRepository.find.mockResolvedValue(mockAlbums);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });
});