import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
    redis = module.get('default_IORedisModuleConnectionToken') as jest.Mocked<Redis>;

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
  });
});