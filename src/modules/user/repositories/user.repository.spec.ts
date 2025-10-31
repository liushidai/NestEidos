import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { CacheService } from '../../redis/cache.service';
import { User } from '../entities/user.entity';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockRepository: jest.Mocked<Repository<User>>;
  let cacheService: jest.Mocked<CacheService>;

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
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      has: jest.fn(),
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
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    mockRepository = module.get(getRepositoryToken(User));
    cacheService = module.get(CacheService);

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

      expect(cacheService.get).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1234567890123456789');

      expect(cacheService.get).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(cacheService.set).toHaveBeenCalledWith('user:id:1234567890123456789', mockUser, 3600);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found in database', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user from cache if found', async () => {
      cacheService.get.mockResolvedValue(mockUser);

      const result = await userRepository.findByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:username:testuser');
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:username:testuser');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ userName: 'testuser' });
      expect(cacheService.set).toHaveBeenCalledWith('user:username:testuser', mockUser, 3600);
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create user and clear cache', async () => {
      const userData = { userName: 'newuser', passWord: 'password', userType: 10 };
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await userRepository.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(cacheService.delete).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user and clear cache', async () => {
      const updateData = { userName: 'updateduser' };
      const updatedUser = { ...mockUser, ...updateData };

      // 第一次 findOneBy 调用获取旧用户信息
      mockRepository.findOneBy.mockResolvedValueOnce(mockUser);
      // 第二次 findOneBy 调用获取更新后的用户信息
      mockRepository.findOneBy.mockResolvedValueOnce(updatedUser as any);
      mockRepository.update.mockResolvedValue({} as any);

      const result = await userRepository.update('1234567890123456789', updateData);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(mockRepository.update).toHaveBeenCalledWith('1234567890123456789', updateData);
      expect(cacheService.delete).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:updateduser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:updateduser');
      expect(cacheService.set).toHaveBeenCalledWith('user:id:1234567890123456789', updatedUser, 3600);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user and clear cache', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await expect(userRepository.delete('1234567890123456789')).resolves.not.toThrow();

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(mockRepository.delete).toHaveBeenCalledWith('1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:testuser');
    });

    it('should throw error when user not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(userRepository.delete('123')).rejects.toThrow('删除用户失败，用户不存在: 123');
    });
  });

  describe('existsByUserName', () => {
    it('should return existence from cache if found', async () => {
      cacheService.get.mockResolvedValue(true);

      const result = await userRepository.existsByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(result).toBe(true);
      expect(mockRepository.count).not.toHaveBeenCalled();
    });

    it('should check existence from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      mockRepository.count.mockResolvedValue(1);

      const result = await userRepository.existsByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(mockRepository.count).toHaveBeenCalledWith({ where: { userName: 'testuser' } });
      expect(cacheService.set).toHaveBeenCalledWith('user:exists:username:testuser', true, 300);
      expect(result).toBe(true);
    });
  });
});