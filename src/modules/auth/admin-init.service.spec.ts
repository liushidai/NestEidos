import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdminInitService } from './admin-init.service';
import { UserRepository } from '../user/repositories/user.repository';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('AdminInitService', () => {
  let service: AdminInitService;
  let userRepository: jest.Mocked<UserRepository>;
  let configService: jest.Mocked<ConfigService>;
  let processExitSpy: jest.SpyInstance;

  const mockUser = {
    id: '1234567890123456789',
    userName: 'admin',
    passWord: 'hashedpassword',
    userType: 1,
    userStatus: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockUserRepository = {
    findByUserName: jest.fn(),
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminInitService,
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

    service = module.get<AdminInitService>(AdminInitService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should skip initialization if admin user already exists', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(mockUser);

      await service.onModuleInit();

      expect(userRepository.findByUserName).toHaveBeenCalledWith('admin');
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should exit process if admin password is not configured', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('');

      await service.onModuleInit();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit process if admin password is too short', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('123'); // Less than 8 characters

      await service.onModuleInit();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should create admin user with valid password', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('Admin123456!');
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'auth.security.bcryptRounds') return 12;
        if (key === 'adminPassword') return 'Admin123456!';
        return null;
      });

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);

      await service.onModuleInit();

      expect(userRepository.findByUserName).toHaveBeenCalledWith('admin');
      expect(bcrypt.hash).toHaveBeenCalledWith('Admin123456!', 12);
      expect(userRepository.create).toHaveBeenCalledWith({
        userName: 'admin',
        passWord: 'hashedpassword',
        userType: 1,
        userStatus: 1,
      });
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockUserRepository.findByUserName.mockRejectedValue(new Error('Database connection failed'));

      await service.onModuleInit();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should use default bcrypt rounds if not configured', async () => {
      mockUserRepository.findByUserName.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('Admin123456!');
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'adminPassword') return 'Admin123456!';
        return null; // auth.security.bcryptRounds not configured
      });

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);

      await service.onModuleInit();

      expect(bcrypt.hash).toHaveBeenCalledWith('Admin123456!', 12); // Default value
    });
  });
});