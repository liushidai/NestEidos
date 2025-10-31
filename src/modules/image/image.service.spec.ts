import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
import { StorageService } from '../../services/storage.service';
import { TempFileService } from '../../services/temp-file.service';
import { ConfigService } from '@nestjs/config';
import { SecureIdUtil } from '../../utils/secure-id.util';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';

describe('ImageService', () => {
  let service: ImageService;
  let imageRepository: jest.Mocked<Repository<Image>>;
  let fileRepository: jest.Mocked<Repository<File>>;
  let storageService: jest.Mocked<StorageService>;
  let tempFileService: jest.Mocked<TempFileService>;
  let configService: jest.Mocked<ConfigService>;

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
  };

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
  };

  beforeEach(async () => {
    // 设置测试环境变量
    process.env.SECURE_ID_SECRET_KEY = 'test-secret-key-32-bytes-long';

    const mockImageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockFileRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
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
          provide: getRepositoryToken(Image),
          useValue: mockImageRepository,
        },
        {
          provide: getRepositoryToken(File),
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
            encode: jest.fn().mockReturnValue('encodedId'),
          },
        },
      ],
    }).compile();

    service = module.get<ImageService>(ImageService);
    imageRepository = module.get(getRepositoryToken(Image));
    fileRepository = module.get(getRepositoryToken(File));
    storageService = module.get(StorageService);
    tempFileService = module.get(TempFileService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return image with file relation', async () => {
      imageRepository.findOne.mockResolvedValue(mockImage);

      const result = await service.findById('1234567890123456789');

      expect(imageRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1234567890123456789' },
        relations: ['file'],
      });
      expect(result).toEqual(mockImage);
    });

    it('should return null if image not found', async () => {
      imageRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return image with file relation for valid user', async () => {
      imageRepository.findOne.mockResolvedValue(mockImage);

      const result = await service.findByIdAndUserId('1234567890123456789', '1234567890123456788');

      expect(imageRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1234567890123456789', userId: '1234567890123456788' },
        relations: ['file'],
      });
      expect(result).toEqual(mockImage);
    });

    it('should return null if image not found or user not authorized', async () => {
      imageRepository.findOne.mockResolvedValue(null);

      const result = await service.findByIdAndUserId('1234567890123456789', 'wrongUserId');

      expect(result).toBeNull();
    });
  });

  describe('findFileByHash', () => {
    it('should return file if hash exists', async () => {
      fileRepository.findOne.mockResolvedValue(mockFile);

      const result = await service.findFileByHash(mockFile.hash);

      expect(fileRepository.findOne).toHaveBeenCalledWith({ hash: mockFile.hash });
      expect(result).toEqual(mockFile);
    });

    it('should return null if hash not found', async () => {
      fileRepository.findOne.mockResolvedValue(null);

      const result = await service.findFileByHash('nonexistentHash');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update image title', async () => {
      const updateDto: UpdateImageDto = { title: '更新后的标题' };
      const updatedImage = {
        ...mockImage,
        title: updateDto.title,
        updatedAt: new Date()
      };

      imageRepository.findOne.mockResolvedValue(mockImage);
      imageRepository.save.mockResolvedValue(updatedImage as any);

      const result = await service.update(mockImage.id, mockImage.userId, updateDto);

      expect(imageRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockImage.id, userId: mockImage.userId },
        relations: ['file'],
      });
      expect(imageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockImage,
          title: updateDto.title,
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(updatedImage);
    });
  });

  describe('delete', () => {
    it('should delete image and file if no other images reference it', async () => {
      imageRepository.findOne.mockResolvedValue(mockImage);
      imageRepository.remove.mockResolvedValue(mockImage);
      imageRepository.count.mockResolvedValue(0); // No other images reference this file
      fileRepository.findOne.mockResolvedValue(mockFile);

      await service.delete(mockImage.id, mockImage.userId);

      expect(imageRepository.remove).toHaveBeenCalledWith(mockImage);
      expect(imageRepository.count).toHaveBeenCalledWith({ where: { fileId: mockFile.id } });
      expect(storageService.deleteMany).toHaveBeenCalledWith([
        mockFile.originalKey,
        mockFile.webpKey,
        mockFile.avifKey,
      ]);
      expect(fileRepository.remove).toHaveBeenCalledWith(mockFile);
    });

    it('should delete only image if file is referenced by other images', async () => {
      imageRepository.findOne.mockResolvedValue(mockImage);
      imageRepository.remove.mockResolvedValue(mockImage);
      imageRepository.count.mockResolvedValue(1); // One other image references this file

      await service.delete(mockImage.id, mockImage.userId);

      expect(imageRepository.remove).toHaveBeenCalledWith(mockImage);
      expect(imageRepository.count).toHaveBeenCalledWith({ where: { fileId: mockFile.id } });
      expect(storageService.deleteMany).not.toHaveBeenCalled();
      expect(fileRepository.remove).not.toHaveBeenCalled();
    });
  });
});