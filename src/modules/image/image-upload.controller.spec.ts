import { Test, TestingModule } from '@nestjs/testing';
import { ImageUploadController } from './image-upload.controller';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
import { CreateImageDto } from './dto/create-image.dto';

describe('ImageUploadController', () => {
  let controller: ImageUploadController;
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
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageUploadController],
      providers: [
        {
          provide: ImageService,
          useValue: mockImageService,
        },
      ],
    }).compile();

    controller = module.get<ImageUploadController>(ImageUploadController);
    imageService = module.get(ImageService) as jest.Mocked<ImageService>;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const createImageDto: CreateImageDto = {
        title: '测试图片',
        albumId: '0',
      };

      const mockFileData: Express.Multer.File = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        buffer: Buffer.from('test'),
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: {
          on: jest.fn(),
          pipe: jest.fn(),
          destroy: jest.fn(),
        } as any,
      };

      imageService.create.mockResolvedValue(mockImage);

      const mockRequest = { user: mockUser } as any;

      const result = await controller.uploadImage(mockFileData, createImageDto, mockRequest);

      expect(imageService.create).toHaveBeenCalledWith(
        createImageDto,
        mockUser.userId,
        mockFileData
      );
      expect(result).toEqual(mockImage);
    });
  });
});