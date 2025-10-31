import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user from repository', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('1234567890123456789');

      expect(userRepository.findById).toHaveBeenCalledWith('1234567890123456789');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(userRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user from repository', async () => {
      userRepository.findByUserName.mockResolvedValue(mockUser);

      const result = await service.findByUserName('testuser');

      expect(userRepository.findByUserName).toHaveBeenCalledWith('testuser');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findByUserName.mockResolvedValue(null);

      const result = await service.findByUserName('nonexistent');

      expect(userRepository.findByUserName).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user via repository', async () => {
      const userData = { userName: 'newuser', passWord: 'password', userType: 10 };
      const newUser = { ...mockUser, ...userData };
      userRepository.create.mockResolvedValue(newUser as any);

      const result = await service.create(userData);

      expect(userRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(newUser);
    });
  });

  describe('update', () => {
    it('should update user via repository', async () => {
      const updateData = { userName: 'updateduser' };
      const updatedUser = { ...mockUser, ...updateData };
      userRepository.update.mockResolvedValue(updatedUser as any);

      const result = await service.update('1234567890123456789', updateData);

      expect(userRepository.update).toHaveBeenCalledWith('1234567890123456789', updateData);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user via repository', async () => {
      userRepository.delete.mockResolvedValue(undefined);

      await service.delete('1234567890123456789');

      expect(userRepository.delete).toHaveBeenCalledWith('1234567890123456789');
    });
  });

  describe('existsByUserName', () => {
    it('should check existence via repository', async () => {
      userRepository.existsByUserName.mockResolvedValue(true);

      const result = await service.existsByUserName('testuser');

      expect(userRepository.existsByUserName).toHaveBeenCalledWith('testuser');
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      userRepository.existsByUserName.mockResolvedValue(false);

      const result = await service.existsByUserName('nonexistent');

      expect(userRepository.existsByUserName).toHaveBeenCalledWith('nonexistent');
      expect(result).toBe(false);
    });
  });
});