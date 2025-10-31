import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { CacheService } from '../redis/cache.service';
import { User } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
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

  const mockUserRepository = {
    findById: jest.fn(),
    findByUserName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsByUserName: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    has: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user from cache if found', async () => {
      cacheService.get.mockResolvedValue(mockUser);

      const result = await service.findById('1234567890123456789');

      expect(cacheService.get).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(result).toEqual(mockUser);
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('1234567890123456789');

      expect(cacheService.get).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(userRepository.findById).toHaveBeenCalledWith('1234567890123456789');
      expect(cacheService.set).toHaveBeenCalledWith('user:id:1234567890123456789', mockUser, 3600);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found in database', async () => {
      cacheService.get.mockResolvedValue(undefined);
      userRepository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(userRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user from cache if found', async () => {
      cacheService.get.mockResolvedValue(mockUser);

      const result = await service.findByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:username:testuser');
      expect(result).toEqual(mockUser);
      expect(userRepository.findByUserName).not.toHaveBeenCalled();
    });

    it('should return user from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      userRepository.findByUserName.mockResolvedValue(mockUser);

      const result = await service.findByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:username:testuser');
      expect(userRepository.findByUserName).toHaveBeenCalledWith('testuser');
      expect(cacheService.set).toHaveBeenCalledWith('user:username:testuser', mockUser, 3600);
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create user and clear cache', async () => {
      const userData = { userName: 'newuser', passWord: 'password', userType: 10 };
      const newUser = { ...mockUser, userName: 'newuser' };
      userRepository.create.mockResolvedValue(newUser as any);

      const result = await service.create(userData);

      expect(userRepository.create).toHaveBeenCalledWith(userData);
      expect(cacheService.delete).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:newuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:newuser');
      expect(result).toEqual(newUser);
    });
  });

  describe('update', () => {
    it('should update user and clear cache', async () => {
      const updateData = { userName: 'updateduser' };
      const updatedUser = { ...mockUser, ...updateData };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser as any);

      const result = await service.update('1234567890123456789', updateData);

      expect(userRepository.findById).toHaveBeenCalledWith('1234567890123456789');
      expect(userRepository.update).toHaveBeenCalledWith('1234567890123456789', updateData);
      expect(cacheService.delete).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:updateduser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:updateduser');
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user and clear cache', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue(undefined);

      await service.delete('1234567890123456789');

      expect(userRepository.findById).toHaveBeenCalledWith('1234567890123456789');
      expect(userRepository.delete).toHaveBeenCalledWith('1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:id:1234567890123456789');
      expect(cacheService.delete).toHaveBeenCalledWith('user:username:testuser');
      expect(cacheService.delete).toHaveBeenCalledWith('user:exists:username:testuser');
    });
  });

  describe('existsByUserName', () => {
    it('should return existence from cache if found', async () => {
      cacheService.get.mockResolvedValue(true);

      const result = await service.existsByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(result).toBe(true);
      expect(userRepository.existsByUserName).not.toHaveBeenCalled();
    });

    it('should check existence from database if not in cache', async () => {
      cacheService.get.mockResolvedValue(undefined);
      userRepository.existsByUserName.mockResolvedValue(true);

      const result = await service.existsByUserName('testuser');

      expect(cacheService.get).toHaveBeenCalledWith('user:exists:username:testuser');
      expect(userRepository.existsByUserName).toHaveBeenCalledWith('testuser');
      expect(cacheService.set).toHaveBeenCalledWith('user:exists:username:testuser', true, 300);
      expect(result).toBe(true);
    });
  });
});