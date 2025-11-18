import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import * as bcrypt from 'bcrypt';

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
    findUsersWithPagination: jest.fn(),
    toggleUserStatus: jest.fn(),
    resetPassword: jest.fn(),
    exists: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();

    // 设置默认配置
    mockConfigService.get.mockReturnValue(10); // 默认bcrypt轮数

    // 设置exists方法的默认返回值
    mockUserRepository.exists.mockResolvedValue(false);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user from repository', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('1234567890123456789');

      expect(userRepository.findById).toHaveBeenCalledWith(
        '1234567890123456789',
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(userRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ========== 管理员功能测试 ==========

  describe('findUsersWithPagination', () => {
    it('should return paginated users', async () => {
      const query: UserQueryDto = {
        page: 1,
        limit: 10,
        userName: 'test',
      };

      const mockResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      userRepository.findUsersWithPagination.mockResolvedValue(mockResult);

      const result = await service.findUsersWithPagination(query);

      expect(userRepository.findUsersWithPagination).toHaveBeenCalledWith(
        query,
      );
      expect(result.users[0]).toBeInstanceOf(UserProfileDto);
      expect(result.total).toBe(1);
    });
  });

  describe('getUserDetailById', () => {
    it('should return user detail', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserDetailById('user-id');

      expect(userRepository.findById).toHaveBeenCalledWith('user-id');
      expect(result).toBeInstanceOf(UserProfileDto);
      expect(result?.userName).toBe('testuser');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getUserDetailById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status successfully', async () => {
      const updatedUser = mockUser;
      updatedUser.userStatus = 2;
      userRepository.toggleUserStatus.mockResolvedValue(updatedUser);

      const toggleDto: ToggleUserStatusDto = { userStatus: 2 };
      const result = await service.toggleUserStatus('user-id', toggleDto);

      expect(userRepository.toggleUserStatus).toHaveBeenCalledWith(
        'user-id',
        2,
      );
      expect(result.userStatus).toBe(2);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.toggleUserStatus.mockRejectedValue(
        new Error('用户不存在'),
      );

      const toggleDto: ToggleUserStatusDto = { userStatus: 2 };
      await expect(
        service.toggleUserStatus('nonexistent', toggleDto),
      ).rejects.toThrow('用户不存在');
    });
  });

  describe('resetUserPassword', () => {
    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);
    });

    it('should reset password with default password', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.resetPassword.mockResolvedValue(mockUser);

      const resetDto: ResetPasswordDto = { useDefaultPassword: true };
      const result = await service.resetUserPassword('user-id', resetDto);

      expect(userRepository.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.hash).toHaveBeenCalledWith('TempPassword123!', 10);
      expect(userRepository.resetPassword).toHaveBeenCalledWith(
        'user-id',
        'hashedPassword',
      );
      expect(result.success).toBe(true);
      expect(result.newPassword).toBe('TempPassword123!');
    });

    it('should reset password with custom password', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.resetPassword.mockResolvedValue(mockUser);

      const resetDto: ResetPasswordDto = { newPassword: 'CustomPassword123!' };
      const result = await service.resetUserPassword('user-id', resetDto);

      expect(userRepository.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.hash).toHaveBeenCalledWith('CustomPassword123!', 10);
      expect(userRepository.resetPassword).toHaveBeenCalledWith(
        'user-id',
        'hashedPassword',
      );
      expect(result.success).toBe(true);
      expect(result.newPassword).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const resetDto: ResetPasswordDto = { useDefaultPassword: true };
      await expect(
        service.resetUserPassword('nonexistent', resetDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no password provided', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const resetDto: ResetPasswordDto = {};
      await expect(
        service.resetUserPassword('user-id', resetDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      userRepository.exists.mockResolvedValue(true);

      const result = await service.userExists('user-id');

      expect(userRepository.exists).toHaveBeenCalledWith('user-id');
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      userRepository.exists.mockResolvedValue(false);

      const result = await service.userExists('nonexistent');

      expect(userRepository.exists).toHaveBeenCalledWith('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when error occurs', async () => {
      userRepository.exists.mockRejectedValue(new Error('Database error'));

      const result = await service.userExists('user-id');

      expect(result).toBe(false);
    });
  });
});
