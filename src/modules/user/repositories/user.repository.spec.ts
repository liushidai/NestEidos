import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { SimpleCacheService } from '@/common/cache';
import { User } from '../entities/user.entity';
import { TTL_CONFIGS, TTLUtils, CacheKeyUtils } from '@/common/ttl/tls.config';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockRepository: jest.Mocked<Repository<User>>;
  let cacheService: jest.Mocked<SimpleCacheService>;

  const mockUser = {
    id: '1234567890123456789',
    userName: 'testuser',
    passWord: 'hashedpassword',
    userType: 10,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const mockUserRepository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: SimpleCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    mockRepository = module.get(getRepositoryToken(User));
    cacheService = module.get(SimpleCacheService);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userRepository).toBeDefined();
  });

  describe('findById', () => {
    it('should return user from cache if found', async () => {
      cacheService.get.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1234567890123456789');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKey('user', 'id', '1234567890123456789'));
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1234567890123456789');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKey('user', 'id', '1234567890123456789'));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(cacheService.set).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKey('user', 'id', '1234567890123456789'), mockUser, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found in database', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKey('user', 'id', 'nonexistent'));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user from database directly (no cache)', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findByUserName('testuser');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ userName: 'testuser' });
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by username', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findByUserName('nonexistent');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ userName: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user', async () => {
      const userData = { userName: 'newuser', passWord: 'password', userType: 10 };
      const newUser = { ...mockUser, ...userData };
      mockRepository.create.mockReturnValue(newUser as any);
      mockRepository.save.mockResolvedValue(newUser);

      const result = await userRepository.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(newUser);
    });
  });
});