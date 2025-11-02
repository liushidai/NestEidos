import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { TokenGuard } from '../auth/guards/token.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UserQueryDto } from './dto/user-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { UserProfileDto } from './dto/user-profile.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let userService: jest.Mocked<UserService>;

  const mockAdminUser = {
    userId: 'admin-id',
    userName: 'admin',
    userType: 1,
  };

  const mockRegularUser = {
    id: 'user-id',
    userName: 'testuser',
    userType: 10,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    findUsersWithPagination: jest.fn(),
    getUserDetailById: jest.fn(),
    toggleUserStatus: jest.fn(),
    resetUserPassword: jest.fn(),
    userExists: jest.fn(),
  };

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  const mockTokenGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockAdminGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: TokenGuard,
          useValue: mockTokenGuard,
        },
        {
          provide: AdminGuard,
          useValue: mockAdminGuard,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    userService = module.get(UserService) as jest.Mocked<UserService>;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserDetailById', () => {
    it('should return user detail', async () => {
      const userId = 'user-id';
      const expectedUser = UserProfileDto.fromUser(mockRegularUser);

      mockUserService.getUserDetailById.mockResolvedValue(expectedUser);

      const result = await controller.getUserDetailById(userId);

      expect(userService.getUserDetailById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUser);
    });

    it('should handle not found user', async () => {
      const userId = 'nonexistent-id';

      mockUserService.getUserDetailById.mockRejectedValue(new NotFoundException('用户不存在'));

      await expect(controller.getUserDetailById(userId)).rejects.toThrow(NotFoundException);
      expect(userService.getUserDetailById).toHaveBeenCalledWith(userId);
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status successfully', async () => {
      const userId = 'user-id';
      const toggleDto: ToggleUserStatusDto = { userStatus: 2 };
      const expectedUser = UserProfileDto.fromUser({ ...mockRegularUser, userStatus: 2 });

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      mockUserService.toggleUserStatus.mockResolvedValue(expectedUser);

      const result = await controller.toggleUserStatus(userId, toggleDto, mockRequest);

      expect(userService.toggleUserStatus).toHaveBeenCalledWith(userId, toggleDto);
      expect(result).toEqual(expectedUser);
    });

    it('should prevent admin from toggling their own status', async () => {
      const toggleDto: ToggleUserStatusDto = { userStatus: 2 };

      const mockRequest = {
        user: { ...mockAdminUser, userId: 'user-id' },
      } as any;

      await expect(controller.toggleUserStatus('user-id', toggleDto, mockRequest))
        .rejects.toThrow(BadRequestException);

      expect(userService.toggleUserStatus).not.toHaveBeenCalled();
    });

    it('should handle not found user', async () => {
      const userId = 'nonexistent-id';
      const toggleDto: ToggleUserStatusDto = { userStatus: 2 };

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      mockUserService.toggleUserStatus.mockRejectedValue(new NotFoundException('用户不存在'));

      await expect(controller.toggleUserStatus(userId, toggleDto, mockRequest))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset password with default password', async () => {
      const userId = 'user-id';
      const resetDto: ResetPasswordDto = {
        useDefaultPassword: true,
      };

      const expectedResult = {
        success: true,
        message: '密码重置成功',
        newPassword: 'TempPassword123!',
      };

      mockUserService.resetUserPassword.mockResolvedValue(expectedResult);

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const result = await controller.resetUserPassword(userId, resetDto, mockRequest);

      expect(userService.resetUserPassword).toHaveBeenCalledWith(userId, resetDto);
      expect(result).toEqual(expectedResult);
    });

    it('should reset password with custom password', async () => {
      const userId = 'user-id';
      const resetDto: ResetPasswordDto = {
        newPassword: 'CustomPassword123!',
        useDefaultPassword: false,
      };

      const expectedResult = {
        success: true,
        message: '密码重置成功',
      };

      mockUserService.resetUserPassword.mockResolvedValue(expectedResult);

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const result = await controller.resetUserPassword(userId, resetDto, mockRequest);

      expect(userService.resetUserPassword).toHaveBeenCalledWith(userId, resetDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle not found user', async () => {
      const userId = 'nonexistent-id';
      const resetDto: ResetPasswordDto = {
        newPassword: 'CustomPassword123!',
      };

      mockUserService.resetUserPassword.mockRejectedValue(new NotFoundException('用户不存在'));

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      await expect(controller.resetUserPassword(userId, resetDto, mockRequest))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle bad request for missing password', async () => {
      const userId = 'user-id';
      const resetDto: ResetPasswordDto = {};

      mockUserService.resetUserPassword.mockRejectedValue(
        new BadRequestException('必须提供新密码或使用默认密码选项')
      );

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      await expect(controller.resetUserPassword(userId, resetDto, mockRequest))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('checkUserExists', () => {
    it('should return true for existing user', async () => {
      const userId = 'existing-id';

      mockUserService.userExists.mockResolvedValue(true);

      const result = await controller.checkUserExists(userId);

      expect(userService.userExists).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ exists: true });
    });

    it('should return false for non-existing user', async () => {
      const userId = 'nonexistent-id';

      mockUserService.userExists.mockResolvedValue(false);

      const result = await controller.checkUserExists(userId);

      expect(userService.userExists).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ exists: false });
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'error-id';

      mockUserService.userExists.mockResolvedValue(false); // Should return false on error

      const result = await controller.checkUserExists(userId);

      expect(userService.userExists).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ exists: false });
    });
  });
});