import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: '1234567890123456789',
    userName: 'testuser',
    userType: 10,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    validateToken: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      userName: 'testuser',
      passWord: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      const userWithPassword = { ...mockUser, passWord: 'hashedpassword' };
      mockAuthService.register.mockResolvedValue(userWithPassword);

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        id: mockUser.id,
        userName: mockUser.userName,
        userType: mockUser.userType,
        userStatus: mockUser.userStatus,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty('passWord');
    });

    it('should handle registration errors', async () => {
      const error = new Error('Username already exists');
      mockAuthService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(error);
    });

    it('should throw ConflictException when username is admin', async () => {
      const adminRegisterDto: RegisterUserDto = {
        userName: 'admin',
        passWord: 'Password123!',
      };

      const error = new ConflictException('用户名 admin 不允许注册');
      mockAuthService.register.mockRejectedValue(error);

      await expect(controller.register(adminRegisterDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      userName: 'testuser',
      passWord: 'Password123!',
    };

    it('should login user successfully', async () => {
      const loginResponse = {
        token:
          'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        expires_in: 3600,
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(loginResponse);
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });
  });

  describe('logout', () => {
    const token =
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

    it('should logout user successfully', async () => {
      const mockRequest = {
        user: { userId: '1234567890123456789', userName: 'testuser' },
        headers: { authorization: `Bearer ${token}` },
      } as any;

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(mockRequest);

      expect(mockAuthService.logout).toHaveBeenCalledWith(token);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        userId: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
      };

      const mockRequest = {
        user: mockUser,
      } as any;

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      const mockUser = {
        userId: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
      };

      const mockRequest = {
        user: mockUser,
      } as any;

      const expectedResponse = {
        success: true,
        message: '密码修改成功',
      };

      mockAuthService.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(
        mockRequest,
        changePasswordDto,
      );

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        mockUser.userId,
        changePasswordDto,
      );
    });

    it('should handle service errors', async () => {
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!',
      };

      const mockUser = {
        userId: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
      };

      const mockRequest = {
        user: mockUser,
      } as any;

      mockAuthService.changePassword.mockRejectedValue(
        new Error('旧密码不正确'),
      );

      await expect(
        controller.changePassword(mockRequest, changePasswordDto),
      ).rejects.toThrow('旧密码不正确');
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        mockUser.userId,
        changePasswordDto,
      );
    });
  });
});
