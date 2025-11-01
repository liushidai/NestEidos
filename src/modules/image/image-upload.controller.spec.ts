import { Test, TestingModule } from '@nestjs/testing';
import { ImageUploadController } from './image-upload.controller';
import { ImageService } from './image.service';
import { Image } from './entities/image.entity';
import { CreateImageDto } from './dto/create-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';

describe('ImageUploadController', () => {
  let controller: ImageUploadController;
  let imageService: jest.Mocked<ImageService>;

  const mockImage: Image = {
    id: '1234567890123456789',
    userId: '1234567890123456788',
    albumId: '0',
    originalName: 'test.jpg',
    title: '测试图片',
    imageHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    imageSize: 1024000,
    imageMimeType: 'image/jpeg',
    imageWidth: 1920,
    imageHeight: 1080,
    originalKey: 'originals/test.jpg',
    jpegKey: 'processed/test.jpg',
    webpKey: 'processed/test.webp',
    avifKey: 'processed/test.avif',
    hasJpeg: true,
    hasWebp: true,
    hasAvif: true,
    convertJpegParamId: null,
    convertWebpParamId: null,
    convertAvifParamId: null,
    defaultFormat: 'avif',
    expirePolicy: 1,
    expiresAt: new Date('9999-12-31T23:59:59Z'),
    nsfwScore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

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
      const uploadImageDto: UploadImageDto = {
        title: '测试图片',
        albumId: '0',
        file: {} as Express.Multer.File, // 这个字段在控制器中由 @UploadedFile() 装饰器处理
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

      const result = await controller.uploadImage(mockFileData, uploadImageDto, mockRequest);

      // 验证控制器正确转换了 DTO 并调用服务
      const expectedCreateImageDto: CreateImageDto = {
        title: '测试图片',
        albumId: '0',
      };

      expect(imageService.create).toHaveBeenCalledWith(
        expectedCreateImageDto,
        mockUser.userId,
        mockFileData
      );
      expect(result).toEqual(mockImage);
    });
  });
});