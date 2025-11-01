import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImageService } from './image.service';
import { ImageRepository } from './repositories/image.repository';
import { FileRepository } from './repositories/file.repository';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
import { StorageService } from '../../services/storage.service';
import { TempFileService } from '../../services/temp-file.service';
import { ConfigService } from '@nestjs/config';
import { SecureIdUtil } from '../../utils/secure-id.util';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';

describe('ImageService (Refactored)', () => {
  let service: ImageService;
  let imageRepository: jest.Mocked<ImageRepository>;
  let fileRepository: jest.Mocked<FileRepository>;
  let storageService: jest.Mocked<StorageService>;
  let tempFileService: jest.Mocked<TempFileService>;
  let configService: jest.Mocked<ConfigService>;

  // 设置测试环境变量
  beforeAll(() => {
    process.env.SECURE_ID_SECRET_KEY = 'test-secret-key-32-bytes-long';
  });

  const mockFile: File = {
    id: '1234567890123456790',
    hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    originalKey: 'images/test.jpg',
    webpKey: 'images/test.webp',
    avifKey: 'images/test.avif',
    hasWebp: true,
    hasAvif: true,
    convertWebpParamId: null,
    convertAvifParamId: null,
    createdAt: new Date(),
  } as any;

  const mockImage: Image = {
    id: '1234567890123456789',
    userId: '1234567890123456788',
    albumId: '0',
    originalName: 'test.jpg',
    title: '测试图片',
    fileId: mockFile.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    file: mockFile,
    user: {} as any,
    album: null,
    generateId: jest.fn(),
    setCreatedAt: jest.fn(),
    setUpdatedAt: jest.fn(),
  } as any;

  const mockFileData: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000,
    buffer: Buffer.from('test'),
    filename: '',
    path: '',
    destination: '',
    stream: null as any,
  };

  beforeEach(async () => {

    const mockImageRepository = {
      findById: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isImageBelongsToUser: jest.fn(),
      countByFileId: jest.fn(),
    };

    const mockFileRepository = {
      findByHash: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    const mockStorageService = {
      upload: jest.fn(),
      deleteMany: jest.fn(),
    };

    const mockTempFileService = {
      saveTempFile: jest.fn(),
      deleteTempFile: jest.fn(),
      deleteTempFiles: jest.fn(),
      createTempFile: jest.fn(),
      getFileSize: jest.fn(),
      readTempFile: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        {
          provide: ImageRepository,
          useValue: mockImageRepository,
        },
        {
          provide: FileRepository,
          useValue: mockFileRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: TempFileService,
          useValue: mockTempFileService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SecureIdUtil,
          useValue: {
            getInstance: jest.fn().mockReturnValue({
              encode: jest.fn().mockReturnValue('encoded123'),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ImageService>(ImageService);
    imageRepository = module.get(ImageRepository) as jest.Mocked<ImageRepository>;
    fileRepository = module.get(FileRepository) as jest.Mocked<FileRepository>;
    storageService = module.get(StorageService) as jest.Mocked<StorageService>;
    tempFileService = module.get(TempFileService) as jest.Mocked<TempFileService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return image if found', async () => {
      imageRepository.findById.mockResolvedValue(mockImage);

      const result = await service.findById('1234567890123456789');

      expect(imageRepository.findById).toHaveBeenCalledWith('1234567890123456789');
      expect(result).toEqual(mockImage);
    });

    it('should return null if image not found', async () => {
      imageRepository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(imageRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return image if found for user', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(mockImage);

      const result = await service.findByIdAndUserId('1234567890123456789', '1234567890123456788');

      expect(imageRepository.findByIdAndUserId).toHaveBeenCalledWith('1234567890123456789', '1234567890123456788');
      expect(result).toEqual(mockImage);
    });

    it('should return null if image not found for user', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(null);

      const result = await service.findByIdAndUserId('1234567890123456789', 'wronguser');

      expect(imageRepository.findByIdAndUserId).toHaveBeenCalledWith('1234567890123456789', 'wronguser');
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return paginated images for user', async () => {
      const queryDto: QueryImageDto = { page: 1, limit: 10 };
      const mockImages = [mockImage];
      const expectedResult = {
        images: mockImages,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      imageRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId('1234567890123456788', queryDto);

      expect(imageRepository.findByUserId).toHaveBeenCalledWith(
        '1234567890123456788',
        1,
        10,
        undefined,
        undefined,
        undefined
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated images with search and filters', async () => {
      const queryDto: QueryImageDto = {
        page: 2,
        limit: 5,
        search: '测试',
        albumId: 'album123',
        mimeType: ['image/jpeg']
      };
      const mockImages = [mockImage];
      const expectedResult = {
        images: mockImages,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      };

      imageRepository.findByUserId.mockResolvedValue(expectedResult);

      const result = await service.findByUserId('1234567890123456788', queryDto);

      expect(imageRepository.findByUserId).toHaveBeenCalledWith(
        '1234567890123456788',
        2,
        5,
        '测试',
        'album123',
        ['image/jpeg']
      );
      expect(result).toEqual(expectedResult);
    });

    it('should validate page and limit parameters', async () => {
      const invalidQueryDto: QueryImageDto = { page: -1, limit: 0 };

      await expect(service.findByUserId('1234567890123456788', invalidQueryDto))
        .rejects.toThrow(BadRequestException);

      expect(imageRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('should reject limit greater than 100', async () => {
      const invalidQueryDto: QueryImageDto = { page: 1, limit: 101 };

      await expect(service.findByUserId('1234567890123456788', invalidQueryDto))
        .rejects.toThrow(BadRequestException);

      expect(imageRepository.findByUserId).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateImageDto: UpdateImageDto = { title: '更新后的图片名' };
    const userId = '1234567890123456788';
    const imageId = '1234567890123456789';

    it('should successfully update image', async () => {
      const updatedImage = { ...mockImage, title: '更新后的图片名' };
      imageRepository.update.mockResolvedValue({
        oldImage: mockImage,
        updatedImage,
      });

      const result = await service.update(imageId, userId, updateImageDto);

      expect(imageRepository.update).toHaveBeenCalledWith(imageId, userId, updateImageDto);
      expect(result).toEqual(updatedImage);
    });

    it('should throw NotFoundException if image does not exist', async () => {
      const error = new Error('图片不存在或无权限操作');
      imageRepository.update.mockRejectedValue(error);

      await expect(service.update(imageId, userId, updateImageDto))
        .rejects.toThrow(NotFoundException);

      expect(imageRepository.update).toHaveBeenCalledWith(imageId, userId, updateImageDto);
    });

    it('should rethrow other errors from repository', async () => {
      const error = new Error('Database error');
      imageRepository.update.mockRejectedValue(error);

      await expect(service.update(imageId, userId, updateImageDto))
        .rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    const userId = '1234567890123456788';
    const imageId = '1234567890123456789';

    it('should successfully delete image when file is still referenced', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(mockImage);
      imageRepository.delete.mockResolvedValue(undefined);
      imageRepository.countByFileId.mockResolvedValue(3); // File is still referenced by other images

      await service.delete(imageId, userId);

      expect(imageRepository.delete).toHaveBeenCalledWith(imageId, userId);
      expect(fileRepository.delete).not.toHaveBeenCalled();
    });

    it('should successfully delete image and file when file is not referenced', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(mockImage);
      imageRepository.delete.mockResolvedValue(undefined);
      imageRepository.countByFileId.mockResolvedValue(0); // File is not referenced by other images
      fileRepository.findById.mockResolvedValue(mockFile);
      fileRepository.delete.mockResolvedValue(undefined);
      storageService.deleteMany.mockResolvedValue(undefined);

      await service.delete(imageId, userId);

      expect(imageRepository.delete).toHaveBeenCalledWith(imageId, userId);
      expect(fileRepository.delete).toHaveBeenCalledWith(mockFile.id);
      expect(storageService.deleteMany).toHaveBeenCalledWith([
        mockFile.originalKey,
        mockFile.webpKey,
        mockFile.avifKey,
      ]);
    });

    it('should throw NotFoundException if image does not exist', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.delete(imageId, userId))
        .rejects.toThrow(NotFoundException);

      expect(imageRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('isImageBelongsToUser', () => {
    it('should return true if image belongs to user', async () => {
      imageRepository.isImageBelongsToUser.mockResolvedValue(true);

      const result = await service.isImageBelongsToUser(
        '1234567890123456789',
        '1234567890123456788',
      );

      expect(imageRepository.isImageBelongsToUser).toHaveBeenCalledWith(
        '1234567890123456789',
        '1234567890123456788',
      );
      expect(result).toBe(true);
    });

    it('should return false if image does not belong to user', async () => {
      imageRepository.isImageBelongsToUser.mockResolvedValue(false);

      const result = await service.isImageBelongsToUser(
        '1234567890123456789',
        'wronguser',
      );

      expect(imageRepository.isImageBelongsToUser).toHaveBeenCalledWith(
        '1234567890123456789',
        'wronguser',
      );
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    const createImageDto: CreateImageDto = { title: '新图片' };
    const userId = '1234567890123456788';

    it('should handle image creation with new file', async () => {
      // Mock the complex file processing flow
      tempFileService.saveTempFile.mockResolvedValue('/tmp/test.jpg');
      fileRepository.findByHash.mockResolvedValue(null); // New file
      tempFileService.createTempFile.mockResolvedValue('/tmp/test.webp');
      tempFileService.getFileSize.mockResolvedValue(1000);
      tempFileService.readTempFile.mockResolvedValue(Buffer.from('test'));
      storageService.upload
        .mockResolvedValueOnce('images/test.jpg')
        .mockResolvedValueOnce('images/test.webp');
      tempFileService.deleteTempFiles.mockResolvedValue(undefined);

      fileRepository.create.mockResolvedValue(mockFile);
      imageRepository.create.mockResolvedValue(mockImage);

      const result = await service.create(createImageDto, userId, mockFileData);

      expect(tempFileService.saveTempFile).toHaveBeenCalledWith(mockFileData);
      expect(fileRepository.findByHash).toHaveBeenCalled();
      expect(fileRepository.create).toHaveBeenCalled();
      expect(imageRepository.create).toHaveBeenCalledWith({
        id: expect.any(String),
        userId,
        albumId: '0',
        title: '新图片',
        originalName: 'test.jpg',
        fileId: mockFile.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(mockImage);
    });

    it('should handle image creation with existing file', async () => {
      tempFileService.saveTempFile.mockResolvedValue('/tmp/test.jpg');
      fileRepository.findByHash.mockResolvedValue(mockFile); // Existing file
      tempFileService.deleteTempFile.mockResolvedValue(undefined);
      imageRepository.create.mockResolvedValue(mockImage);

      const result = await service.create(createImageDto, userId, mockFileData);

      expect(tempFileService.saveTempFile).toHaveBeenCalledWith(mockFileData);
      expect(fileRepository.findByHash).toHaveBeenCalled();
      expect(tempFileService.deleteTempFile).toHaveBeenCalled();
      expect(fileRepository.create).not.toHaveBeenCalled(); // Should not create new file
      expect(imageRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockImage);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle storage service errors during delete', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(mockImage);
      imageRepository.delete.mockResolvedValue(undefined);
      imageRepository.countByFileId.mockResolvedValue(0);
      fileRepository.findById.mockResolvedValue(mockFile);
      fileRepository.delete.mockResolvedValue(undefined);
      storageService.deleteMany.mockRejectedValue(new Error('Storage error'));

      // Should not throw error, just log it
      await expect(service.delete('1234567890123456789', '1234567890123456788'))
        .resolves.not.toThrow();
    });

    it('should handle missing file during delete', async () => {
      imageRepository.findByIdAndUserId.mockResolvedValue(mockImage);
      imageRepository.delete.mockResolvedValue(undefined);
      imageRepository.countByFileId.mockResolvedValue(0);
      fileRepository.findById.mockResolvedValue(null);

      await service.delete('1234567890123456789', '1234567890123456788');

      expect(fileRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Performance and integration', () => {
    it('should maintain consistent service layer behavior', async () => {
      // 测试service层的委托行为
      imageRepository.findById.mockResolvedValue(mockImage);
      imageRepository.findByIdAndUserId.mockResolvedValue(mockImage);
      imageRepository.isImageBelongsToUser.mockResolvedValue(true);

      const imageId = '1234567890123456789';
      const userId = '1234567890123456788';

      // 测试所有方法都正确委托给repository
      await service.findById(imageId);
      await service.findByIdAndUserId(imageId, userId);
      await service.isImageBelongsToUser(imageId, userId);

      expect(imageRepository.findById).toHaveBeenCalledWith(imageId);
      expect(imageRepository.findByIdAndUserId).toHaveBeenCalledWith(imageId, userId);
      expect(imageRepository.isImageBelongsToUser).toHaveBeenCalledWith(imageId, userId);
    });
  });
});