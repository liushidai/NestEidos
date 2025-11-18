import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AlbumService } from './album.service';
import { AlbumRepository } from './repositories/album.repository';
import { Album } from './entities/album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';

describe('AlbumService', () => {
  let service: AlbumService;
  let repository: jest.Mocked<AlbumRepository>;

  const mockAlbum = {
    id: '1234567890123456789',
    userId: '1234567890123456788',
    albumName: '我的相册',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Album;

  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUserId: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isAlbumBelongsToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumService,
        {
          provide: AlbumRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AlbumService>(AlbumService);
    repository = module.get(AlbumRepository);

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
      mockRepository.create.mockResolvedValue(mockAlbum);

      const result = await service.create(createAlbumDto, userId);

      expect(mockRepository.create).toHaveBeenCalledWith(albumToCreate);
      expect(result).toEqual(mockAlbum);
    });

    it('should throw error when repository fails to create', async () => {
      const error = new Error('Repository error');
      mockRepository.create.mockRejectedValue(error);

      await expect(service.create(createAlbumDto, userId)).rejects.toThrow(
        error,
      );
    });
  });

  describe('findById', () => {
    it('should return album if found', async () => {
      mockRepository.findById.mockResolvedValue(mockAlbum);

      const result = await service.findById('1234567890123456789');

      expect(mockRepository.findById).toHaveBeenCalledWith(
        '1234567890123456789',
      );
      expect(result).toEqual(mockAlbum);
    });

    it('should return null if album not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(mockRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return album if found for user', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(mockAlbum);

      const result = await service.findByIdAndUserId(
        '1234567890123456789',
        '1234567890123456788',
      );

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith(
        '1234567890123456789',
        '1234567890123456788',
      );
      expect(result).toEqual(mockAlbum);
    });

    it('should return null if album not found for user', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(null);

      const result = await service.findByIdAndUserId(
        '1234567890123456789',
        'wronguser',
      );

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith(
        '1234567890123456789',
        'wronguser',
      );
      expect(result).toBeNull();
    });

    it('should return null if album does not exist', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(null);

      const result = await service.findByIdAndUserId(
        'nonexistent',
        '1234567890123456788',
      );

      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'nonexistent',
        '1234567890123456788',
      );
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    const userId = '1234567890123456788';

    it('should return paginated albums for user', async () => {
      const queryDto: QueryAlbumDto = { page: 1, limit: 10 };
      const mockAlbums = [mockAlbum];
      const expectedResult = {
        albums: mockAlbums,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        10,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated albums with search', async () => {
      const queryDto: QueryAlbumDto = { page: 2, limit: 5, search: '相册' };
      const mockAlbums = [mockAlbum];
      const expectedResult = {
        albums: mockAlbums,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      };

      mockRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        2,
        5,
        '相册',
      );
      expect(result).toEqual(expectedResult);
    });

    it('should use default pagination values', async () => {
      const queryDto: QueryAlbumDto = {};
      const expectedResult = {
        albums: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      mockRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        10,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should validate page and limit parameters', async () => {
      const invalidQueryDto: QueryAlbumDto = { page: -1, limit: 0 };

      await expect(
        service.findByUserId(userId, invalidQueryDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('should reject limit greater than 100', async () => {
      const invalidQueryDto: QueryAlbumDto = { page: 1, limit: 101 };

      await expect(
        service.findByUserId(userId, invalidQueryDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('should handle string page and limit parameters', async () => {
      const queryDto = { page: '2', limit: '5' } as any;
      const expectedResult = {
        albums: [mockAlbum],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      };

      mockRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        2,
        5,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    const updateAlbumDto: UpdateAlbumDto = { albumName: '更新后的相册名' };
    const userId = '1234567890123456788';
    const albumId = '1234567890123456789';

    it('should successfully update album', async () => {
      const updatedAlbum = { ...mockAlbum, albumName: '更新后的相册名' };
      mockRepository.update.mockResolvedValue({
        oldAlbum: mockAlbum,
        updatedAlbum,
      });

      const result = await service.update(albumId, userId, updateAlbumDto);

      expect(mockRepository.update).toHaveBeenCalledWith(
        albumId,
        userId,
        updateAlbumDto,
      );
      expect(result).toEqual(updatedAlbum);
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const error = new Error('相册不存在或无权限操作');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        service.update(albumId, userId, updateAlbumDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).toHaveBeenCalledWith(
        albumId,
        userId,
        updateAlbumDto,
      );
    });

    it('should throw NotFoundException if album does not belong to user', async () => {
      const error = new Error('相册不存在或无权限操作');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        service.update(albumId, 'wronguser', updateAlbumDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).toHaveBeenCalledWith(
        albumId,
        'wronguser',
        updateAlbumDto,
      );
    });

    it('should rethrow other errors from repository', async () => {
      const error = new Error('Database error');
      mockRepository.update.mockRejectedValue(error);

      await expect(
        service.update(albumId, userId, updateAlbumDto),
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    const userId = '1234567890123456788';
    const albumId = '1234567890123456789';

    it('should successfully delete album', async () => {
      mockRepository.delete.mockResolvedValue(undefined);

      await service.delete(albumId, userId);

      expect(mockRepository.delete).toHaveBeenCalledWith(albumId, userId);
    });

    it('should throw NotFoundException if album does not exist', async () => {
      const error = new Error('相册不存在或无权限操作');
      mockRepository.delete.mockRejectedValue(error);

      await expect(service.delete(albumId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.delete).toHaveBeenCalledWith(albumId, userId);
    });

    it('should throw NotFoundException if album does not belong to user', async () => {
      const error = new Error('相册不存在或无权限操作');
      mockRepository.delete.mockRejectedValue(error);

      await expect(service.delete(albumId, 'wronguser')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.delete).toHaveBeenCalledWith(albumId, 'wronguser');
    });

    it('should rethrow other errors from repository', async () => {
      const error = new Error('Database error');
      mockRepository.delete.mockRejectedValue(error);

      await expect(service.delete(albumId, userId)).rejects.toThrow(error);
    });
  });

  describe('isAlbumBelongsToUser', () => {
    it('should return true if album belongs to user', async () => {
      mockRepository.isAlbumBelongsToUser.mockResolvedValue(true);

      const result = await service.isAlbumBelongsToUser(
        '1234567890123456789',
        '1234567890123456788',
      );

      expect(mockRepository.isAlbumBelongsToUser).toHaveBeenCalledWith(
        '1234567890123456789',
        '1234567890123456788',
      );
      expect(result).toBe(true);
    });

    it('should return false if album does not belong to user', async () => {
      mockRepository.isAlbumBelongsToUser.mockResolvedValue(false);

      const result = await service.isAlbumBelongsToUser(
        '1234567890123456789',
        'wronguser',
      );

      expect(mockRepository.isAlbumBelongsToUser).toHaveBeenCalledWith(
        '1234567890123456789',
        'wronguser',
      );
      expect(result).toBe(false);
    });

    it('should return false if album does not exist', async () => {
      mockRepository.isAlbumBelongsToUser.mockResolvedValue(false);

      const result = await service.isAlbumBelongsToUser(
        'nonexistent',
        '1234567890123456788',
      );

      expect(mockRepository.isAlbumBelongsToUser).toHaveBeenCalledWith(
        'nonexistent',
        '1234567890123456788',
      );
      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed');
      mockRepository.isAlbumBelongsToUser.mockRejectedValue(error);

      await expect(
        service.isAlbumBelongsToUser(
          '1234567890123456789',
          '1234567890123456788',
        ),
      ).rejects.toThrow(error);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty albumName in create', async () => {
      const createAlbumDto: CreateAlbumDto = { albumName: '' };
      const userId = '1234567890123456788';
      const expectedAlbum = { ...mockAlbum, albumName: '' };

      mockRepository.create.mockResolvedValue(expectedAlbum);

      const result = await service.create(createAlbumDto, userId);

      expect(result).toEqual(expectedAlbum);
    });

    it('should handle very long albumName', async () => {
      const longName = 'a'.repeat(200);
      const createAlbumDto: CreateAlbumDto = { albumName: longName };
      const userId = '1234567890123456788';
      const expectedAlbum = { ...mockAlbum, albumName: longName };

      mockRepository.create.mockResolvedValue(expectedAlbum);

      const result = await service.create(createAlbumDto, userId);

      expect(result.albumName).toBe(longName);
    });

    it('should handle special characters in search', async () => {
      const queryDto: QueryAlbumDto = { search: '相册!@#$%^&*()' };
      const userId = '1234567890123456788';
      const expectedResult = {
        albums: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      mockRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId(userId, queryDto);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        10,
        '相册!@#$%^&*()',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Performance and integration', () => {
    it('should handle large result sets efficiently', async () => {
      const queryDto: QueryAlbumDto = { limit: 100 };
      const userId = '1234567890123456788';
      const mockAlbums = Array(100)
        .fill(null)
        .map((_, index) => ({
          ...mockAlbum,
          id: `album-${index}`,
          albumName: `相册 ${index}`,
        }));
      const expectedResult = {
        albums: mockAlbums,
        total: 100,
        page: 1,
        limit: 100,
        totalPages: 1,
      };

      mockRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.albums).toHaveLength(100);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(1);
    });

    it('should maintain consistent service layer behavior', async () => {
      // 测试service层的委托行为
      mockRepository.findById.mockResolvedValue(mockAlbum);
      mockRepository.findByIdAndUserId.mockResolvedValue(mockAlbum);
      mockRepository.isAlbumBelongsToUser.mockResolvedValue(true);

      const albumId = '1234567890123456789';
      const userId = '1234567890123456788';

      // 测试所有方法都正确委托给repository
      await service.findById(albumId);
      await service.findByIdAndUserId(albumId, userId);
      await service.isAlbumBelongsToUser(albumId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(albumId);
      expect(mockRepository.findByIdAndUserId).toHaveBeenCalledWith(
        albumId,
        userId,
      );
      expect(mockRepository.isAlbumBelongsToUser).toHaveBeenCalledWith(
        albumId,
        userId,
      );
    });
  });
});
