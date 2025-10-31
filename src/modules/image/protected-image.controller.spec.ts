import { Test, TestingModule } from '@nestjs/testing';
import { ProtectedImageController } from './protected-image.controller';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImageDto } from './dto/query-image.dto';

describe('ProtectedImageController', () => {
  let controller: ProtectedImageController;
  let imageService: jest.Mocked<ImageService>;

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

  const mockUser = {
    userId: '1234567890123456788',
    userName: 'testuser',
    userType: 10,
  };

  const mockImageService = {
    findByUserId: jest.fn(),
    findByIdAndUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProtectedImageController],
      providers: [
        {
          provide: ImageService,
          useValue: mockImageService,
        },
      ],
    }).compile();

    controller = module.get<ProtectedImageController>(ProtectedImageController);
    imageService = module.get(ImageService) as jest.Mocked<ImageService>;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated images for user', async () => {
      const queryDto: QueryImageDto = { page: 1, limit: 10 };
      const expectedResult = {
        images: [mockImage],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      imageService.findByUserId.mockResolvedValue(expectedResult);

      const mockRequest = { user: mockUser } as any;

      const result = await controller.findAll(queryDto, mockRequest);

      expect(imageService.findByUserId).toHaveBeenCalledWith(mockUser.userId, queryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return image if it belongs to user', async () => {
      imageService.findByIdAndUserId.mockResolvedValue(mockImage);

      const mockRequest = { user: mockUser } as any;

      const result = await controller.findOne(mockImage.id, mockRequest);

      expect(imageService.findByIdAndUserId).toHaveBeenCalledWith(mockImage.id, mockUser.userId);
      expect(result).toEqual(mockImage);
    });
  });

  describe('update', () => {
    it('should update image title', async () => {
      const updateDto: UpdateImageDto = { title: '更新后的标题' };
      const updatedImage = { ...mockImage, title: updateDto.title };

      imageService.update.mockResolvedValue(updatedImage as any);

      const mockRequest = { user: mockUser } as any;

      const result = await controller.update(mockImage.id, updateDto, mockRequest);

      expect(imageService.update).toHaveBeenCalledWith(mockImage.id, mockUser.userId, updateDto);
      expect(result).toEqual(updatedImage);
    });
  });

  describe('remove', () => {
    it('should delete image', async () => {
      imageService.delete.mockResolvedValue(undefined);

      const mockRequest = { user: mockUser } as any;

      await controller.remove(mockImage.id, mockRequest);

      expect(imageService.delete).toHaveBeenCalledWith(mockImage.id, mockUser.userId);
    });
  });
});