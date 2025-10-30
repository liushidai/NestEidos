import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: '1234567890123456789',
    userName: 'testuser',
    passWord: 'hashedpassword',
    userType: 10,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findById('1234567890123456789');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user if found', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findByUserName('testuser');

      expect(repository.findOneBy).toHaveBeenCalledWith({ userName: 'testuser' });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.findByUserName('nonexistent');

      expect(repository.findOneBy).toHaveBeenCalledWith({ userName: 'nonexistent' });
      expect(result).toBeNull();
    });
  });
});