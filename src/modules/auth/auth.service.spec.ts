import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CacheService } from '@/cache';
import { UserRepository } from '../user/repositories/user.repository';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
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

  const mockUserRepository = {
    findByUserName: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    clear: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
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
        {
          provide: 'TTL_CONFIGS',
          useValue: {
            AUTH_TOKEN: { value: 150, unit: 'days' }, // 实际默认值是150天
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    // 默认配置值
    mockConfigService.get.mockImplementation((key: string) => {
      const defaults: Record<string, any> = {
        'auth.token.expiresIn': 3600,
        'auth.token.bytesLength': 32,
        'auth.redis.keyPrefix': 'auth:token:',
        'auth.security.bcryptRounds': 10,
      };
      return defaults[key];
    });

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      userName: 'testuser',
      passWord: 'Password123!',
    };

    it('should successfully register a new user', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      const expectedUser = { ...registerDto, passWord: 'hashedpassword', userType: 10 };
      const createdUser = { ...expectedUser, id: mockUser.id, userStatus: mockUser.userStatus, createdAt: mockUser.createdAt, updatedAt: mockUser.updatedAt };
      mockUserRepository.create.mockReturnValue(createdUser as User);

      const result = await service.register(registerDto);

      expect(mockUserRepository.findByUserName).toHaveBeenCalledWith(registerDto.userName);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.passWord, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(expectedUser);
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if username is admin', async () => {
      const adminRegisterDto: RegisterUserDto = {
        userName: 'admin',
        passWord: 'Password123!',
      };

      await expect(service.register(adminRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if username is ADMIN (uppercase)', async () => {
      const adminRegisterDto: RegisterUserDto = {
        userName: 'ADMIN',
        passWord: 'Password123!',
      };

      await expect(service.register(adminRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      userName: 'testuser',
      passWord: 'Password123!',
    };

    it('should successfully login and return token', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expires_in', 12960000); // 150天 = 12960000秒
      expect(typeof result.token).toBe('string');
      expect(result.token).toHaveLength(64); // 32 bytes * 2 (hex) = 64 chars
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      const bannedUser = { ...mockUser, userStatus: 2 };
      mockUserRepository.findByUserName.mockResolvedValue(bannedUser);

      const error = await service.login(loginDto).catch(err => err);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('账户已被封锁，请联系管理员');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
    const userData = {
      userId: '1234567890123456789',
      userName: 'testuser',
      userType: 10,
    };

    it('should return user data for valid token', async () => {
      mockCacheService.get.mockResolvedValue(userData);

      const result = await service.validateToken(token);

      expect(mockCacheService.get).toHaveBeenCalledWith(`auth:token:${token}`);
      expect(result).toEqual(userData);
    });

    it('should return null for invalid token', async () => {
      mockCacheService.get.mockResolvedValue(undefined);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      mockCacheService.get.mockResolvedValue(undefined);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

    it('should successfully logout', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.logout(token);

      expect(mockCacheService.delete).toHaveBeenCalledWith(`auth:token:${token}`);
    });
  });

  describe('generateToken', () => {
    it('should generate a token with correct length', async () => {
      const loginDto: LoginUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockUserRepository.findByUserName.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result.token).toHaveLength(64); // 32 bytes in hex
      expect(/^[a-f0-9]{64}$/.test(result.token)).toBe(true);
    });

    it('should use custom token bytes length from config', async () => {
      // 设置自定义配置
      mockConfigService.get.mockImplementation((key: string) => {
        const defaults: Record<string, any> = {
          'auth.token.expiresIn': 3600,
          'auth.token.bytesLength': 16, // 自定义16字节
          'auth.redis.keyPrefix': 'auth:token:',
          'auth.security.bcryptRounds': 10,
        };
        return defaults[key];
      });

      const loginDto: LoginUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockUserRepository.findByUserName.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result.token).toHaveLength(32); // 16 bytes in hex
      expect(/^[a-f0-9]{32}$/.test(result.token)).toBe(true);
    });
  });

  describe('Configuration handling', () => {
    it('should use custom token expiration time from config', async () => {
      // 设置自定义配置
      mockConfigService.get.mockImplementation((key: string) => {
        const defaults: Record<string, any> = {
          'auth.token.expiresIn': 2, // 2小时
          'auth.token.bytesLength': 32,
          'auth.redis.keyPrefix': 'auth:token:',
          'auth.security.bcryptRounds': 10,
        };
        return defaults[key];
      });

      const loginDto: LoginUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockUserRepository.findByUserName.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result.expires_in).toBe(7200); // 2小时 = 7200秒
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:token:'),
        expect.any(Object),
        { value: 2, unit: 'hours' },
      );
    });

    it('should use default Redis key prefix', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      const userData = {
        userId: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
      };

      mockCacheService.get.mockResolvedValue(userData);

      await service.validateToken(token);

      expect(mockCacheService.get).toHaveBeenCalledWith(`auth:token:${token}`);
    });

    it('should use custom bcrypt rounds from config', async () => {
      // 设置自定义配置
      mockConfigService.get.mockImplementation((key: string) => {
        const defaults: Record<string, any> = {
          'auth.token.expiresIn': 3600,
          'auth.token.bytesLength': 32,
          'auth.redis.keyPrefix': 'auth:token:',
          'auth.security.bcryptRounds': 12, // 自定义12轮
        };
        return defaults[key];
      });

      const registerDto: RegisterUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockUserRepository.findByUserName.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ ...registerDto, passWord: 'hashedpassword' } as User);
      // UserRepository.create handles the save operation

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.passWord, 12);
    });
  });

  describe('Redis error handling', () => {
    it('should handle Redis connection error during login', async () => {
      const loginDto: LoginUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockUserRepository.findByUserName.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockCacheService.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle Redis connection error during token validation', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockCacheService.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should handle Redis connection error during logout gracefully', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockCacheService.delete.mockRejectedValue(new Error('Redis connection failed'));

      // 注销不应该抛出异常
      await expect(service.logout(token)).resolves.toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty Redis response during token validation', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockCacheService.get.mockResolvedValue(undefined);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should handle null config values gracefully', async () => {
      // 设置配置返回 null
      mockConfigService.get.mockReturnValue(null);

      const registerDto: RegisterUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockUserRepository.findByUserName.mockResolvedValue(null);
      const expectedUser = { ...registerDto, passWord: 'hashedpassword', userType: 10 };
      const createdUser = { ...expectedUser, id: mockUser.id, userStatus: mockUser.userStatus, createdAt: mockUser.createdAt, updatedAt: mockUser.updatedAt };
      mockUserRepository.create.mockReturnValue(createdUser as User);

      await service.register(registerDto);

      // 应该使用默认值 10
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.passWord, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith(expectedUser);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password with correct old password', async () => {
      const userId = '1234567890123456789';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never).mockResolvedValueOnce(false as never); // 第二次比较返回false，表示新密码与旧密码不同
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword' as never);
      mockUserRepository.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(userId, changePasswordDto);

      expect(result).toEqual({
        success: true,
        message: '密码修改成功'
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(changePasswordDto.oldPassword, mockUser.passWord);
      expect(bcrypt.compare).toHaveBeenCalledWith(changePasswordDto.newPassword, mockUser.passWord);
      expect(bcrypt.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 10);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { passWord: 'newhashedpassword' });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const userId = 'nonexistentuser';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException if user status is not 1', async () => {
      const userId = '1234567890123456789';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      const inactiveUser = { ...mockUser, userStatus: 2 };
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException if old password is incorrect', async () => {
      const userId = '1234567890123456789';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'WrongPassword123!',
        newPassword: 'NewPassword456!',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(changePasswordDto.oldPassword, mockUser.passWord);
    });

    it('should throw ConflictException if new password is same as old password', async () => {
      const userId = '1234567890123456789';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'Password123!',
        newPassword: 'Password123!',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(changePasswordDto.oldPassword, mockUser.passWord);
      expect(bcrypt.compare).toHaveBeenCalledWith(changePasswordDto.newPassword, mockUser.passWord);
    });

    it('should use configured bcrypt rounds for password hashing', async () => {
      const userId = '1234567890123456789';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never).mockResolvedValueOnce(false as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword' as never);
      mockUserRepository.update.mockResolvedValue(mockUser);

      // 配置bcrypt轮数
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'auth.security.bcryptRounds') return 14;
        return null;
      });

      await service.changePassword(userId, changePasswordDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 14);
    });

    it('should handle database errors during update', async () => {
      const userId = '1234567890123456789';
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never).mockResolvedValueOnce(false as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword' as never);
      mockUserRepository.update.mockRejectedValue(new Error('Database update failed'));

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow('Database update failed');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userId = '1234567890123456789';
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById(userId);

      expect(result).toBe(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null when user not found', async () => {
      const userId = 'nonexistent';
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.getUserById(userId);

      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });
});