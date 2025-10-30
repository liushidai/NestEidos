import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let redis: jest.Mocked<Redis>;
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

  const mockRepository = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRedis = {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
    redis = module.get('default_IORedisModuleConnectionToken') as jest.Mocked<Redis>;
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
      userType: 10,
    };

    it('should successfully register a new user', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      mockRepository.create.mockReturnValue({ ...registerDto, passWord: 'hashedpassword' } as User);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        userName: registerDto.userName,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.passWord, 10);
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
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
      mockRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expires_in', 3600);
      expect(typeof result.token).toBe('string');
      expect(result.token).toHaveLength(64); // 32 bytes * 2 (hex) = 64 chars
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      const bannedUser = { ...mockUser, userStatus: 2 };
      mockRepository.findOneBy.mockResolvedValue(bannedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockUser);
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
      mockRedis.get.mockResolvedValue(JSON.stringify(userData));

      const result = await service.validateToken(token);

      expect(mockRedis.get).toHaveBeenCalledWith(`auth:token:${token}`);
      expect(result).toEqual(userData);
    });

    it('should return null for invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';

    it('should successfully logout', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.logout(token);

      expect(mockRedis.del).toHaveBeenCalledWith(`auth:token:${token}`);
    });
  });

  describe('generateToken', () => {
    it('should generate a token with correct length', async () => {
      const loginDto: LoginUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
      };

      mockRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockRedis.setex.mockResolvedValue('OK');

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

      mockRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockRedis.setex.mockResolvedValue('OK');

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
          'auth.token.expiresIn': 7200, // 2小时
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

      mockRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.login(loginDto);

      expect(result.expires_in).toBe(7200);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('auth:token:'),
        7200,
        expect.any(String),
      );
    });

    it('should use custom Redis key prefix from config', async () => {
      // 设置自定义配置
      mockConfigService.get.mockImplementation((key: string) => {
        const defaults: Record<string, any> = {
          'auth.token.expiresIn': 3600,
          'auth.token.bytesLength': 32,
          'auth.redis.keyPrefix': 'custom:prefix:',
          'auth.security.bcryptRounds': 10,
        };
        return defaults[key];
      });

      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      const userData = {
        userId: '1234567890123456789',
        userName: 'testuser',
        userType: 10,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(userData));

      await service.validateToken(token);

      expect(mockRedis.get).toHaveBeenCalledWith(`custom:prefix:${token}`);
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
        userType: 10,
      };

      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...registerDto, passWord: 'hashedpassword' } as User);
      mockRepository.save.mockResolvedValue(mockUser);

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

      mockRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle Redis connection error during token validation', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should handle Redis connection error during logout gracefully', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      // 注销不应该抛出异常
      await expect(service.logout(token)).resolves.toBeUndefined();
    });

    it('should handle JSON parsing error during token validation', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockRedis.get.mockResolvedValue('invalid json string');

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty Redis response during token validation', async () => {
      const token = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456';
      mockRedis.get.mockResolvedValue('');

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });

    it('should handle null config values gracefully', async () => {
      // 设置配置返回 null
      mockConfigService.get.mockReturnValue(null);

      const registerDto: RegisterUserDto = {
        userName: 'testuser',
        passWord: 'Password123!',
        userType: 10,
      };

      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...registerDto, passWord: 'hashedpassword' } as User);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.register(registerDto);

      // 应该使用默认值 10
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.passWord, 10);
    });
  });
});