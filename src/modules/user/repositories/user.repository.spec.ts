import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { User } from '../entities/user.entity';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockRepository: jest.Mocked<Repository<User>>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    mockRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(userRepository).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1234567890123456789');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails', async () => {
      const error = new Error('Database error');
      mockRepository.findOneBy.mockRejectedValue(error);

      await expect(userRepository.findById('123')).rejects.toThrow('Database error');
    });
  });

  describe('findByUserName', () => {
    it('should return user when found', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await userRepository.findByUserName('testuser');

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ userName: 'testuser' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await userRepository.findByUserName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return user', async () => {
      const userData = {
        userName: 'newuser',
        passWord: 'password',
        userType: 10,
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await userRepository.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const updateData = { userName: 'updateduser' };
      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.update.mockResolvedValue({} as any);
      mockRepository.findOneBy.mockResolvedValue(updatedUser as any);

      const result = await userRepository.update('1234567890123456789', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('1234567890123456789', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when updated user not found', async () => {
      mockRepository.update.mockResolvedValue({} as any);
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(userRepository.update('123', {})).rejects.toThrow('更新后找不到用户: 123');
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await expect(userRepository.delete('1234567890123456789')).resolves.not.toThrow();

      expect(mockRepository.delete).toHaveBeenCalledWith('1234567890123456789');
    });

    it('should throw error when user not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(userRepository.delete('123')).rejects.toThrow('删除用户失败，用户不存在: 123');
    });
  });

  describe('existsByUserName', () => {
    it('should return true when user exists', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await userRepository.existsByUserName('testuser');

      expect(mockRepository.count).toHaveBeenCalledWith({ where: { userName: 'testuser' } });
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await userRepository.existsByUserName('nonexistent');

      expect(result).toBe(false);
    });
  });
});