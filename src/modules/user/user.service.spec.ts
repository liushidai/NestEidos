import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

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
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;

    // 清除所有 mock 调用记录
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
      // Mock 查找用户不存在
      repository.findOneBy.mockResolvedValue(null);
      // Mock bcrypt 加密
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      // Mock 创建用户
      repository.create.mockReturnValue({ ...registerDto, passWord: 'hashedpassword' } as User);
      // Mock 保存用户
      repository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        userName: registerDto.userName,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.passWord, 10);
      expect(repository.create).toHaveBeenCalledWith({
        ...registerDto,
        passWord: 'hashedpassword',
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException if username already exists', async () => {
      // Mock 查找用户已存在
      repository.findOneBy.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({
        userName: registerDto.userName,
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      userName: 'testuser',
      passWord: 'password123',
    };

    it('should successfully login with correct credentials', async () => {
      // Mock 查找用户存在
      repository.findOneBy.mockResolvedValue(mockUser);
      // Mock bcrypt 验证密码成功
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login(loginDto);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        userName: loginDto.userName,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.passWord, mockUser.passWord);
      expect(result).toEqual({
        id: mockUser.id,
        userName: mockUser.userName,
        userType: mockUser.userType,
        userStatus: mockUser.userStatus,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      // Mock 查找用户不存在
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({
        userName: loginDto.userName,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      const bannedUser = { ...mockUser, userStatus: 2 } as User;
      // Mock 查找用户存在但被封禁
      repository.findOneBy.mockResolvedValue(bannedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({
        userName: loginDto.userName,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return consistent error message for non-existent user', async () => {
      // Mock 查找用户不存在
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      const error = await service.login(loginDto).catch(e => e);
      expect(error.message).toBe('用户名或密码错误');
    });

    it('should return consistent error message for banned user', async () => {
      const bannedUser = { ...mockUser, userStatus: 2 } as User;
      // Mock 查找用户存在但被封禁
      repository.findOneBy.mockResolvedValue(bannedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      const error = await service.login(loginDto).catch(e => e);
      expect(error.message).toBe('用户名或密码错误');
    });

    it('should return consistent error message for wrong password', async () => {
      // Mock 查找用户存在
      repository.findOneBy.mockResolvedValue(mockUser);
      // Mock bcrypt 验证密码失败
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      const error = await service.login(loginDto).catch(e => e);
      expect(error.message).toBe('用户名或密码错误');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Mock 查找用户存在
      repository.findOneBy.mockResolvedValue(mockUser);
      // Mock bcrypt 验证密码失败
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.findOneBy).toHaveBeenCalledWith({
        userName: loginDto.userName,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.passWord, mockUser.passWord);
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findById('1234567890123456789');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: '1234567890123456789' });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('findByUserName', () => {
    it('should return user if found', async () => {
      repository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.findByUserName('testuser');

      expect(repository.findOneBy).toHaveBeenCalledWith({ userName: 'testuser' });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.findByUserName('nonexistent');

      expect(repository.findOneBy).toHaveBeenCalledWith({ userName: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const usersWithPasswords = [mockUser];
      const usersWithoutPasswords = [
        {
          id: mockUser.id,
          userName: mockUser.userName,
          userType: mockUser.userType,
          userStatus: mockUser.userStatus,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      ];

      repository.find.mockResolvedValue(usersWithPasswords);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(usersWithoutPasswords);
    });
  });
});