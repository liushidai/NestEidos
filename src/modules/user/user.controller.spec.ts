import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: '1234567890123456789',
    userName: 'testuser',
    userType: 10,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockUserService = {
    register: jest.fn(),
    login: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService) as jest.Mocked<UserService>;

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      userName: 'testuser',
      passWord: 'Password123!',
      userType: 10,
    };

    it('should register a new user successfully', async () => {
      // Mock service 返回用户对象（包含密码）
      const userWithPassword = { ...mockUser, passWord: 'hashedpassword' };
      mockUserService.register.mockResolvedValue(userWithPassword);

      const result = await controller.register(registerDto);

      expect(mockUserService.register).toHaveBeenCalledWith(registerDto);
      // 验证返回结果不包含密码
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
      mockUserService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(error);
      expect(mockUserService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      userName: 'testuser',
      passWord: 'password123',
    };

    it('should login user successfully', async () => {
      mockUserService.login.mockResolvedValue(mockUser);

      const result = await controller.login(loginDto);

      expect(mockUserService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockUser);
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockUserService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
      expect(mockUserService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      mockUserService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(mockUserService.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    it('should handle find all errors', async () => {
      const error = new Error('Database error');
      mockUserService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
      expect(mockUserService.findAll).toHaveBeenCalled();
    });
  });
});