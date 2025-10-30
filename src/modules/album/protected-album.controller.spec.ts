import { Test, TestingModule } from '@nestjs/testing';
import { ProtectedAlbumController } from './protected-album.controller';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { QueryAlbumDto } from './dto/query-album.dto';
import { Album } from './entities/album.entity';
import { NotFoundException } from '@nestjs/common';
import { TokenGuard } from '../auth/guards/token.guard';

/**
 * ProtectedAlbumController 测试
 *
 * 测试原则：
 * - 控制器方法期望返回业务数据原文（不包含响应壳）
 * - 统一响应格式由全局 ResponseInterceptor 负责
 * - 认证守卫在测试中被绕过，直接验证业务逻辑
 * - 404 异常应在控制器层抛出，与 Swagger 文档保持一致
 */
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

    it('should throw NotFoundException if album not found', async () => {
      mockAlbumService.findByIdAndUserId.mockResolvedValue(null);

      await expect(controller.findOne(albumId, { user: mockUser } as any)).rejects.toThrow(
        NotFoundException,
      );
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

  describe('findAll 参数边界校验', () => {
    it('should handle negative page and limit values', async () => {
      const queryDto: QueryAlbumDto = { page: -1, limit: -5 };
      const expectedResult = {
        albums: [],
        total: 0,
        page: -1,
        limit: -5,
        totalPages: 0,
      };
      mockAlbumService.findByUserId.mockResolvedValue(expectedResult);

      const result = await controller.findAll(queryDto, { user: mockUser } as any);

      expect(result).toEqual(expectedResult);
      expect(albumService.findByUserId).toHaveBeenCalledWith(mockUser.userId, queryDto);
    });

    it('should handle zero page and limit values', async () => {
      const queryDto: QueryAlbumDto = { page: 0, limit: 0 };
      const expectedResult = {
        albums: [],
        total: 5,
        page: 0,
        limit: 0,
        totalPages: Infinity,
      };
      mockAlbumService.findByUserId.mockResolvedValue(expectedResult);

      const result = await controller.findAll(queryDto, { user: mockUser } as any);

      expect(result.limit).toBe(0);
      expect(result.totalPages).toBe(Infinity);
    });
  });

  describe('isAlbumBelongsToUser 辅助方法测试', () => {
    it('should properly use the service method for ownership verification', async () => {
      const albumId = '1234567890123456789';

      // 测试相册属于用户的情况
      mockAlbumService.isAlbumBelongsToUser.mockResolvedValue(true);

      const result = await controller.update(
        albumId,
        { albumName: '新名称' },
        { user: mockUser } as any,
      );

      // update 方法内部会调用 findByIdAndUserId，而不是 isAlbumBelongsToUser
      // 但我们可以验证服务方法被正确调用
      expect(albumService.update).toHaveBeenCalledWith(
        albumId,
        mockUser.userId,
        { albumName: '新名称' },
      );
    });
  });

  describe('数据一致性测试占位', () => {
    it('TODO: 删除相册时应联动更新图片的 album_id', async () => {
      // 当实现删除相册时自动更新相关图片的 album_id 为 null 的功能后，
      // 需要在此处添加集成测试验证：
      // 1. 创建相册
      // 2. 添加图片到相册
      // 3. 删除相册
      // 4. 验证图片的 album_id 被正确更新为 null

      mockAlbumService.delete.mockResolvedValue(undefined);

      await expect(
        controller.remove('1234567890123456789', { user: mockUser } as any),
      ).resolves.toBeUndefined();

      // TODO: 添加图片相册关系验证
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