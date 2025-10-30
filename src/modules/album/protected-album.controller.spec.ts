import { Test, TestingModule } from '@nestjs/testing';
import { ProtectedAlbumController } from './protected-album.controller';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';
import { Album } from './entities/album.entity';
import { NotFoundException } from '@nestjs/common';
import { TokenGuard } from '../auth/guards/token.guard';

describe('ProtectedAlbumController', () => {
  let controller: ProtectedAlbumController;
  let albumService: jest.Mocked<AlbumService>;

  const mockUser = {
    userId: '1234567890123456788',
    userName: 'testuser',
    userType: 10,
  };

  const mockAlbum: Album = {
    id: '1234567890123456789',
    userId: '1234567890123456788',
    albumName: '我的相册',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Album;

  const mockAlbumService = {
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
      controllers: [ProtectedAlbumController],
      providers: [
        {
          provide: AlbumService,
          useValue: mockAlbumService,
        },
      ],
    })
      .overrideGuard(TokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProtectedAlbumController>(ProtectedAlbumController);
    albumService = module.get(AlbumService) as jest.Mocked<AlbumService>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createAlbumDto: CreateAlbumDto = {
      albumName: '新相册',
    };

    it('should successfully create an album', async () => {
      mockAlbumService.create.mockResolvedValue(mockAlbum);

      const result = await controller.create(createAlbumDto, { user: mockUser } as any);

      expect(albumService.create).toHaveBeenCalledWith(
        createAlbumDto,
        mockUser.userId,
      );
      expect(result).toEqual(mockAlbum);
    });

    it('should handle service errors during creation', async () => {
      const error = new Error('Service error');
      mockAlbumService.create.mockRejectedValue(error);

      await expect(controller.create(createAlbumDto, { user: mockUser } as any)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    const queryDto: QueryAlbumDto = {
      page: 1,
      limit: 10,
      search: '相册',
    };

    const mockPaginatedResult = {
      albums: [mockAlbum],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it('should return paginated albums for user', async () => {
      mockAlbumService.findByUserId.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(queryDto, { user: mockUser } as any);

      expect(albumService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
        queryDto,
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle empty results', async () => {
      const emptyResult = {
        albums: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockAlbumService.findByUserId.mockResolvedValue(emptyResult);

      const result = await controller.findAll(queryDto, { user: mockUser } as any);

      expect(result).toEqual(emptyResult);
    });
  });

  describe('findOne', () => {
    const albumId = '1234567890123456789';

    it('should return album if found and belongs to user', async () => {
      mockAlbumService.findByIdAndUserId.mockResolvedValue(mockAlbum);

      const result = await controller.findOne(albumId, { user: mockUser } as any);

      expect(albumService.findByIdAndUserId).toHaveBeenCalledWith(
        albumId,
        mockUser.userId,
      );
      expect(result).toEqual(mockAlbum);
    });

    it('should return null if album not found', async () => {
      mockAlbumService.findByIdAndUserId.mockResolvedValue(null);

      const result = await controller.findOne(albumId, { user: mockUser } as any);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const albumId = '1234567890123456789';
    const updateAlbumDto: UpdateAlbumDto = {
      albumName: '更新后的相册名',
    };

    it('should successfully update album', async () => {
      const updatedAlbum = { ...mockAlbum, albumName: '更新后的相册名' };
      mockAlbumService.update.mockResolvedValue(updatedAlbum);

      const result = await controller.update(albumId, updateAlbumDto, { user: mockUser } as any);

      expect(albumService.update).toHaveBeenCalledWith(
        albumId,
        mockUser.userId,
        updateAlbumDto,
      );
      expect(result).toEqual(updatedAlbum);
    });

    it('should throw NotFoundException when updating non-existent album', async () => {
      mockAlbumService.update.mockRejectedValue(
        new NotFoundException('相册不存在或无权限操作'),
      );

      await expect(
        controller.update(albumId, updateAlbumDto, { user: mockUser } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const albumId = '1234567890123456789';

    it('should successfully delete album', async () => {
      mockAlbumService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(albumId, { user: mockUser } as any);

      expect(albumService.delete).toHaveBeenCalledWith(albumId, mockUser.userId);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when deleting non-existent album', async () => {
      mockAlbumService.delete.mockRejectedValue(
        new NotFoundException('相册不存在或无权限操作'),
      );

      await expect(controller.remove(albumId, { user: mockUser } as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Data consistency', () => {
    it('should maintain user ownership across operations', async () => {
      const albumId = '1234567890123456789';

      // 创建相册
      mockAlbumService.create.mockResolvedValue(mockAlbum);
      await controller.create({ albumName: '测试相册' }, { user: mockUser } as any);
      expect(albumService.create).toHaveBeenCalledWith(
        expect.any(Object),
        mockUser.userId,
      );

      // 查询相册
      mockAlbumService.findByIdAndUserId.mockResolvedValue(mockAlbum);
      await controller.findOne(albumId, { user: mockUser } as any);
      expect(albumService.findByIdAndUserId).toHaveBeenCalledWith(
        albumId,
        mockUser.userId,
      );

      // 更新相册
      mockAlbumService.update.mockResolvedValue(mockAlbum);
      await controller.update(
        albumId,
        { albumName: '更新后的相册' },
        { user: mockUser } as any,
      );
      expect(albumService.update).toHaveBeenCalledWith(
        albumId,
        mockUser.userId,
        expect.any(Object),
      );

      // 删除相册
      mockAlbumService.delete.mockResolvedValue(undefined);
      await controller.remove(albumId, { user: mockUser } as any);
      expect(albumService.delete).toHaveBeenCalledWith(albumId, mockUser.userId);
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent album object structure', async () => {
      mockAlbumService.findByIdAndUserId.mockResolvedValue(mockAlbum);

      const result = await controller.findOne('1234567890123456789', { user: mockUser } as any);

      if (result) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('albumName');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');
        expect(typeof result.id).toBe('string');
        expect(typeof result.userId).toBe('string');
        expect(typeof result.albumName).toBe('string');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should return consistent pagination structure', async () => {
      const paginatedResult = {
        albums: [mockAlbum],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockAlbumService.findByUserId.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({}, { user: mockUser } as any);

      expect(result).toHaveProperty('albums');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.albums)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.totalPages).toBe('number');
    });
  });
});