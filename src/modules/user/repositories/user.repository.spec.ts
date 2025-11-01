import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from './user.repository';
import { CacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils } from '../../../cache';
import { User } from '../entities/user.entity';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockRepository: jest.Mocked<Repository<User>>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

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
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('nest_eidos:'), // 模拟 REDIS_KEY_PREFIX
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    mockRepository = module.get(getRepositoryToken(User));
    cacheService = module.get(CacheService);
    configService = module.get(ConfigService);

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

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'id', '1234567890123456789'));
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1234567890123456789');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'id', '1234567890123456789'));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(cacheService.set).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'id', '1234567890123456789'), mockUser, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found in database', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'id', 'nonexistent'));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user from cache if found', async () => {
      cacheService.get.mockResolvedValue(mockUser);

      const result = await userRepository.findByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'username', 'testuser'));
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'username', 'testuser'));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ userName: 'testuser' });
      expect(cacheService.set).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'username', 'testuser'), mockUser, TTLUtils.toSeconds(TTL_CONFIGS.USER_CACHE));
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by username', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findByUserName('nonexistent');

      expect(cacheService.get).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'username', 'nonexistent'));
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ userName: 'nonexistent' });
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user and clear username cache', async () => {
      const userData = { userName: 'newuser', passWord: 'password', userType: 10 };
      const newUser = {
        id: '9876543210987654321',
        userName: 'newuser',
        passWord: 'hashedpassword',
        userType: 10,
        userStatus: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      mockRepository.create.mockReturnValue(newUser);
      mockRepository.save.mockResolvedValue(newUser);

      const result = await userRepository.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(newUser);
      expect(cacheService.delete).toHaveBeenCalledWith(CacheKeyUtils.buildRepositoryKeyWithPrefix('nest_eidos:', 'user', 'username', 'newuser'));
      expect(result).toEqual(newUser);
    });
  });
});